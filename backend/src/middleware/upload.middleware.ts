import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';

const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'audio/mpeg',
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'video/mp4',
    'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB

export const uploadsRoot = path.resolve(__dirname, '../../uploads');

const storage = multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        if (!fs.existsSync(uploadsRoot)) {
            fs.mkdirSync(uploadsRoot, { recursive: true });
        }
        cb(null, uploadsRoot);
    },
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const uniqueSuffix = crypto.randomUUID();
        const ext = path.extname(file.originalname).toLowerCase().slice(0, 16);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    },
});

export const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_BYTES,
        files: 10,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            cb(new Error(`Fayl turi ruxsat etilmagan: ${file.mimetype}`));
            return;
        }
        cb(null, true);
    },
});

/** Resolve filename under uploads root; reject path traversal. */
export function safeUploadPath(filename: string): string | null {
    if (!filename || typeof filename !== 'string') return null;
    if (filename.includes('\0')) return null;
    // Reject any path separators or parent segments in the request name
    if (/[/\\]/.test(filename) || filename.includes('..')) return null;
    const base = path.basename(filename);
    if (!base || base !== filename) return null;
    const resolved = path.resolve(uploadsRoot, base);
    const rootWithSep = uploadsRoot.endsWith(path.sep) ? uploadsRoot : uploadsRoot + path.sep;
    if (!resolved.startsWith(rootWithSep) && resolved !== uploadsRoot) {
        return null;
    }
    return resolved;
}
