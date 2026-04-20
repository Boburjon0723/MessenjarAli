import { apiFetch } from "../../lib/api";
import { AuthUser } from "./types";

/** Joriy foydalanuvchi — `GET /api/users/me` */
export async function fetchProfileRequest(): Promise<Partial<AuthUser>> {
  const res = await apiFetch("/api/users/me");
  if (!res.ok) {
    throw new Error("Profil yuklanmadi");
  }
  const row = (await res.json()) as Record<string, unknown>;
  return {
    id: row.id != null ? String(row.id) : undefined,
    name: row.name != null ? String(row.name) : undefined,
    surname: row.surname != null ? String(row.surname) : undefined,
    phone: row.phone != null ? String(row.phone) : undefined,
    username: row.username != null ? String(row.username) : undefined,
    avatar: row.avatar_url != null ? String(row.avatar_url) : (row.avatar != null ? String(row.avatar) : undefined),
    avatar_url: row.avatar_url != null ? String(row.avatar_url) : undefined,
  };
}
