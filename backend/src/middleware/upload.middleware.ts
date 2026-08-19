import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Telegram document qoidasi: fayl turini MIME allowlist bilan kesmaymiz.
 * Windows ZIP ko‘pincha `application/x-zip-compressed` yoki bo‘sh MIME yuboradi.
 * Rasm/video/audio ham document sifatida yuborilishi mumkin.
 */
export const MAX_FILE_MB = 100;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    tgz: 'application/gzip',
    bz2: 'application/x-bzip2',
    xz: 'application/x-xz',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    webm: 'video/webm',
    mp4: 'video/mp4',
};

export function mimeFromFilename(name?: string, declaredMime?: string): string {
    const declared = String(declaredMime || '').trim().toLowerCase();
    if (declared && declared !== 'application/octet-stream') return declared;
    const ext = path.extname(String(name || '')).replace('.', '').toLowerCase();
    return EXT_MIME[ext] || declared || 'application/octet-stream';
}

/** RFC 5987 — brauzer asl nom (kirill, bo‘shliq, .zip) bilan saqlasin. */
export function attachmentDisposition(filename: string): string {
    const raw = String(filename || 'file').replace(/[\r\n"]/g, '_').slice(0, 180) || 'file';
    const ascii = raw.replace(/[^\x20-\x7E]/g, '_').replace(/\\/g, '_') || 'file';
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(raw)}`;
}

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
        if (!file.mimetype) {
            file.mimetype = mimeFromFilename(file.originalname);
        } else {
            file.mimetype = mimeFromFilename(file.originalname, file.mimetype);
        }
        cb(null, true);
    },
});

export function handleMulterError(err: unknown, res: Response): boolean {
    if (!err) return false;
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({
                error: `Fayl hajmi ${MAX_FILE_MB} MB dan oshmasin.`,
                maxMb: MAX_FILE_MB,
            });
            return true;
        }
        res.status(400).json({ error: err.message });
        return true;
    }
    if (err instanceof Error) {
        res.status(415).json({ error: err.message });
        return true;
    }
    res.status(400).json({ error: 'Fayl qabul qilinmadi' });
    return true;
}

export function chatFilesUpload(req: Request, res: Response, next: NextFunction) {
    upload.array('files', 10)(req, res, (err: unknown) => {
        if (handleMulterError(err, res)) return;
        next();
    });
}

export function sessionMaterialUpload(req: Request, res: Response, next: NextFunction) {
    upload.single('material')(req, res, (err: unknown) => {
        if (handleMulterError(err, res)) return;
        next();
    });
}

/** Resolve filename under uploads root; reject path traversal. */
export function safeUploadPath(filename: string): string | null {
    if (!filename || typeof filename !== 'string') return null;
    if (filename.includes('\0')) return null;
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
