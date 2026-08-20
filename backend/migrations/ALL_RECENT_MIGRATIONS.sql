-- =============================================================================
-- BARCHA SO'NGGI O'ZGARISHLAR — BITTA FAYL
-- Manzil: mali-platform/backend/migrations/ALL_RECENT_MIGRATIONS.sql
-- Ishga tushirish: Supabase SQL Editor yoki psql da ketma-ket bajarish
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SPECIALIST_NOTES: Sessiya / guruh qaydlari (client_id nullable, note_type)
-- Asl fayl: backend/migrations/005_specialist_notes_session_support.sql
-- -----------------------------------------------------------------------------
ALTER TABLE specialist_notes
  ALTER COLUMN client_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'specialist_notes' AND column_name = 'note_type'
  ) THEN
    ALTER TABLE specialist_notes ADD COLUMN note_type VARCHAR(20) DEFAULT 'client';
  END IF;
END $$;

COMMENT ON COLUMN specialist_notes.client_id IS 'NULL for session/group notes; set for client-specific notes';
COMMENT ON COLUMN specialist_notes.note_type IS 'client = per-client note, session = group/session note';


-- -----------------------------------------------------------------------------
-- 2. STUDENT_MENTOR_SUBSCRIPTIONS: 30 kunlik obuna (har dars to'lovi emas)
-- Asl fayl: backend/migrations/006_student_mentor_subscriptions.sql
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_mentor_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    amount_paid DECIMAL(20, 2) NOT NULL DEFAULT 0,
    transaction_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_student_mentor ON student_mentor_subscriptions(student_id, mentor_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON student_mentor_subscriptions(expires_at);
COMMENT ON TABLE student_mentor_subscriptions IS 'Talaba 30 kunlik obuna — har dars uchun alohida to''lov emas';


-- -----------------------------------------------------------------------------
-- 3. FIX SUBSCRIPTION UNIQUE: eski bazalarda ON CONFLICT xatosini oldini olish
-- Asl fayl: backend/migrations/009_fix_student_mentor_subscriptions_unique.sql
-- -----------------------------------------------------------------------------
WITH ranked AS (
    SELECT
        ctid,
        ROW_NUMBER() OVER (
            PARTITION BY student_id, mentor_id
            ORDER BY created_at DESC, started_at DESC, id DESC
        ) AS rn
    FROM student_mentor_subscriptions
)
DELETE FROM student_mentor_subscriptions s
USING ranked r
WHERE s.ctid = r.ctid
  AND r.rn > 1;

DROP INDEX IF EXISTS idx_subscriptions_student_mentor;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_student_mentor
ON student_mentor_subscriptions(student_id, mentor_id);
