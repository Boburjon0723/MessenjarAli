import { BACKEND_PUBLIC_ORIGIN } from "./backend-origin";

const trimmed = (process.env.EXPO_PUBLIC_API_URL || BACKEND_PUBLIC_ORIGIN).replace(/\/$/, "");

export const API_URL = trimmed;

export const WS_URL = (() => {
  try {
    const u = new URL(trimmed);
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProto}//${u.host}`;
  } catch {
    const u = new URL(BACKEND_PUBLIC_ORIGIN);
    return `wss://${u.host}`;
  }
})();

