import { Capacitor } from '@capacitor/core';
import { auth, uploadMediaToStorage } from './firebase';

export interface UploadedMediaResult {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function detectLocalMediaDuration(
  file: File,
  kind: 'audio' | 'video'
): Promise<number | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const el = document.createElement(kind);
    el.preload = 'metadata';

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      el.remove();
    };

    el.onloadedmetadata = () => {
      const sec = Number.isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration) : null;
      cleanup();
      resolve(sec);
    };

    el.onerror = () => {
      cleanup();
      resolve(null);
    };

    el.src = objectUrl;
  });
}

function uploadViaBackend(
  file: File,
  kind: 'audio' | 'video',
  token: string,
  onProgress?: (percent: number) => void
): Promise<UploadedMediaResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const endpoint = `${API_BASE}/api/media/upload?kind=${encodeURIComponent(kind)}&filename=${encodeURIComponent(file.name)}`;

    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader(
      'Content-Type',
      file.type || (kind === 'video' ? 'video/mp4' : 'audio/mpeg')
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || '{}') as UploadedMediaResult & {
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && parsed.url) {
          const resolvedUrl =
            parsed.url.startsWith('/') && API_BASE ? `${API_BASE}${parsed.url}` : parsed.url;
          onProgress?.(100);
          resolve({ ...parsed, url: resolvedUrl });
        } else {
          reject(
            new Error(
              parsed.error ||
                (xhr.status === 404
                  ? 'API_NOT_FOUND'
                  : 'ဖိုင်တင်ရာတွင် အခက်အခဲ ဖြစ်ပေါ်နေပါသည်။ ထပ်မံကြိုးစားပေးပါ။')
            )
          );
        }
      } catch {
        reject(new Error('API_NOT_FOUND'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('ကွန်ရက်ချိတ်ဆက်မှု အခက်အခဲကြောင့် ဖိုင်မတင်နိုင်ပါ။'));
    };

    xhr.send(file);
  });
}

export async function uploadMediaFile(
  file: File,
  kind: 'audio' | 'video',
  onProgress?: (percent: number) => void
): Promise<UploadedMediaResult> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Admin အကောင့်ဖြင့် ဝင်ရောက်ပြီးမှ ဖိုင်တင်နိုင်ပါသည်။');
  }

  // In a standalone APK without an external API_BASE URL, upload directly to Firebase Storage
  if (Capacitor.isNativePlatform() && !API_BASE) {
    const url = await uploadMediaToStorage(file, kind, onProgress);
    return {
      url,
      filename: file.name,
      originalName: file.name,
      size: file.size,
      mimeType: file.type || (kind === 'video' ? 'video/mp4' : 'audio/mpeg'),
    };
  }

  const token = await user.getIdToken();
  try {
    return await uploadViaBackend(file, kind, token, onProgress);
  } catch (err) {
    if (err instanceof Error && err.message === 'API_NOT_FOUND') {
      const url = await uploadMediaToStorage(file, kind, onProgress);
      return {
        url,
        filename: file.name,
        originalName: file.name,
        size: file.size,
        mimeType: file.type || (kind === 'video' ? 'video/mp4' : 'audio/mpeg'),
      };
    }
    throw err;
  }
}
