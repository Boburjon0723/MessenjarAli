import { getToken } from './auth-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

export interface UploadProgress {
    loaded: number;
    total: number;
    percent: number;
}

export const uploadFileWithProgress = (
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: UploadProgress) => void
): Promise<any> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const token = typeof window !== 'undefined' ? getToken() : null;

        xhr.open('POST', `${API_URL}${endpoint}`, true);
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress({
                    loaded: event.loaded,
                    total: event.total,
                    percent
                });
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                    resolve(xhr.responseText);
                }
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload aborted'));

        xhr.send(formData);
    });
};
