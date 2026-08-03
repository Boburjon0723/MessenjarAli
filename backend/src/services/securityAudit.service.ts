import { Request } from 'express';
import { pool } from '../config/database';

export type SecurityAuditEvent =
    | 'auth_missing_token'
    | 'auth_invalid_token'
    | 'csrf_rejected'
    | 'logout';

type AuditParams = {
    event: SecurityAuditEvent;
    userId?: string | null;
    success: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
};

/** Best-effort security audit. It must never block or fail the request path. */
export function recordSecurityAudit(req: Request, params: AuditParams): void {
    const forwardedFor = String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim();
    const ipAddress = forwardedFor || String(req.ip || '');
    const userAgent = String(req.headers['user-agent'] || '');

    void pool
        .query(
            `INSERT INTO security_event_audit
                (event, user_id, ip_address, user_agent, success, reason, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
            [
                params.event,
                params.userId || null,
                ipAddress || null,
                userAgent || null,
                params.success,
                params.reason || null,
                JSON.stringify(params.metadata || {}),
            ]
        )
        .catch((error) => {
            console.error('[SecurityAudit] insert failed:', error?.message || error);
        });
}
