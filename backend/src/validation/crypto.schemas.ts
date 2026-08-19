import { z } from 'zod';

export const upsertPublicKeySchema = z.object({
    alg: z.enum(['x25519', 'p256']),
    publicKey: z.string().min(40).max(200),
});
