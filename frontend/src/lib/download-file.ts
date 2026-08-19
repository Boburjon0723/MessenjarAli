import { getToken } from '@/lib/auth-storage';
import { sanitizeDownloadName } from '@/lib/telegram-message-kind';

function apiOrigin(): string {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

function triggerBlobDownload(blob: Blob, filename: string) {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'file';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

async function fetchAsBlob(src: string, headers?: HeadersInit): Promise<Blob> {
    const res = await fetch(src, {
        headers,
        credentials: src.startsWith(apiOrigin()) ? 'include' : 'omit',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) throw new Error('Not a file');
    return res.blob();
}

type SaveFilePickerHandle = {
    createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
    }>;
};

async function saveBlobAs(blob: Blob, filename: string): Promise<void> {
    const picker = (window as Window & {
        showSaveFilePicker?: (opts: {
            suggestedName?: string;
            types?: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<SaveFilePickerHandle>;
    }).showSaveFilePicker;

    if (typeof picker === 'function') {
        try {
            const handle = await picker({ suggestedName: filename });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            if ((err as { name?: string })?.name === 'AbortError') return;
        }
    }

    triggerBlobDownload(blob, filename);
}

/**
 * Telegram document: blob + asl nom.
 * Cross-origin `<a download>` ishlamaydi — GCS CORS yoki proxy orqali blob olinadi.
 */
export async function downloadChatFile(url: string, filename = 'file'): Promise<void> {
    if (!url) throw new Error('No url');
    const name = sanitizeDownloadName(filename);

    let blob: Blob;
    try {
        blob = await fetchAsBlob(url);
    } catch {
        const token = getToken();
        const proxy = `${apiOrigin()}/api/media/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
        blob = await fetchAsBlob(proxy, token ? { Authorization: `Bearer ${token}` } : undefined);
    }

    await saveBlobAs(blob, name);
}
