-- Ensure ON CONFLICT(student_id, mentor_id) works across older production schemas.
-- 1) Remove duplicate rows if any (keep newest by created_at).
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

-- 2) Replace non-unique helper index (if exists) with a unique one.
DROP INDEX IF EXISTS idx_subscriptions_student_mentor;

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_student_mentor
ON student_mentor_subscriptions(student_id, mentor_id);
