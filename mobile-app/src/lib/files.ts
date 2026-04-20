import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getToken } from "./auth-storage";
import { API_URL } from "./config";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

function baseNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).pop();
    return path && path.length > 0 ? path : "fayl";
  } catch {
    const parts = url.split("/");
    return parts[parts.length - 1]?.split("?")[0] || "fayl";
  }
}

/**
 * Autentifikatsiyali URL dan faylni keshga yuklab, tizim "ochish / ulashish" oynasini ochadi
 * (Telegramdagi kabi fayl tanlash).
 */
export async function downloadAndOpenWithSystemSheet(
  remoteUrl: string,
  suggestedName?: string
): Promise<void> {
  const token = await getToken();
  const base = FileSystem.cacheDirectory;
  if (!base) {
    throw new Error("Fayl katalogi mavjud emas");
  }

  const name = sanitizeFileName(suggestedName || baseNameFromUrl(remoteUrl));
  const dest = `${base}${Date.now()}_${name}`;

  const headers: Record<string, string> = {};
  if (token && remoteUrl.includes(API_URL)) {
    headers.Authorization = `Bearer ${token}`;
  }

  const result = await FileSystem.downloadAsync(remoteUrl, dest, { headers });
  const { uri, status } = result;
  if (status >= 400) {
    throw new Error("Fayl yuklanmadi");
  }

  const can = await Sharing.isAvailableAsync();
  if (!can) {
    throw new Error("Faylni ochish bu qurilmada qo‘llab-quvvatlanmaydi");
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: "Faylni ochish",
    mimeType: guessMime(name),
  });
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return "application/octet-stream";
}
