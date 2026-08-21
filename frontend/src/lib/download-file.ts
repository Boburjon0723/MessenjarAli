import { getToken } from '@/lib/auth-storage';
import { sanitizeDownloadName } from '@/lib/telegram-message-kind';

function apiOrigin(): string {
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

function triggerBlobDownload(blob: Blob, filename: string) {
    // Ba'zi MIME (pdf/mp3/mp4) brauzerda yangi tabda ochilishi mumkin —
    // Telegram Web kabi octet-stream + download attr bilan Downloads ga tushadi.
    const forceBlob =
        blob.type && /^(image\/(png|jpe?g|gif|webp)|text\/plain)/i.test(blob.type)
            ? blob
            : new Blob([blob], { type: 'application/octet-stream' });
    const objectUrl = URL.createObjectURL(forceBlob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'file';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2500);
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

/** GCS / cross-origin chat media — auth bilan backend proxy orqali blob oladi. */
export async function fetchChatMediaBlob(url: string, filename?: string): Promise<Blob> {
    if (!url) throw new Error('No url');
    try {
        return await fetchAsBlob(url);
    } catch {
        const token = getToken();
        const nameQ = filename ? `&name=${encodeURIComponent(sanitizeDownloadName(filename))}` : '';
        const proxy = `${apiOrigin()}/api/media/download?url=${encodeURIComponent(url)}${nameQ}`;
        return fetchAsBlob(proxy, token ? { Authorization: `Bearer ${token}` } : undefined);
    }
}

type SaveFilePickerHandle = {
    createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
    }>;
};

/** Faqat "Save as…" (context menu) — Telegram Desktop dagi ToNewFile. */
async function saveBlobWithPicker(blob: Blob, filename: string): Promise<void> {
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

export type DownloadChatFileOptions = {
    /**
     * true → "Save as…" dialog (File System Access API).
     * false/default → Telegram Web: to‘g‘ridan-to‘g‘ri brauzer Downloads ga (dialogsiz).
     */
    saveAs?: boolean;
};

/**
 * Telegram Web document click: blob + `<a download>` → Downloads.
 * Desktopdagi `Downloads/Telegram Desktop/` papkasini brauzerda majburlab bo‘lmaydi.
 */
export async function downloadChatFile(
    url: string,
    filename = 'file',
    opts?: DownloadChatFileOptions
): Promise<void> {
    if (!url) throw new Error('No url');
    const name = sanitizeDownloadName(filename);
    const blob = await fetchChatMediaBlob(url, name);

    if (opts?.saveAs) {
        await saveBlobWithPicker(blob, name);
        return;
    }
    triggerBlobDownload(blob, name);
}
