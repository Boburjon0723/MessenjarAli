import type { Message } from "../features/chat/types";
import { getUser } from "./auth-storage";
import { decryptTextEnvelope } from "./e2e-crypto";
import { E2E_PLACEHOLDER, isE2eEnvelope } from "./e2e-envelope";

export async function decryptMessage(msg: Message): Promise<Message> {
  if (!isE2eEnvelope(msg.metadata)) return msg;
  const user = await getUser();
  const userId = user?.id;
  if (!userId) return { ...msg, text: E2E_PLACEHOLDER, e2e: true };
  const plain = await decryptTextEnvelope(String(userId), msg.text || "", msg.metadata);
  if (plain == null) return { ...msg, text: E2E_PLACEHOLDER, e2e: true };
  return { ...msg, text: plain, e2e: true };
}

export async function decryptMessages(messages: Message[]): Promise<Message[]> {
  return Promise.all(messages.map(decryptMessage));
}

export async function decryptListPreview(
  cipher: string | undefined,
  meta: unknown,
  fallback: string
): Promise<string> {
  if (!isE2eEnvelope(meta) || !cipher) return fallback;
  const user = await getUser();
  const userId = user?.id;
  if (!userId) return fallback;
  const plain = await decryptTextEnvelope(String(userId), cipher, meta as Record<string, unknown>);
  return plain ?? fallback;
}
