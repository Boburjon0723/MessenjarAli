import { z } from 'zod';

export const transferSchema = z.object({
    receiverId: z.string().uuid(),
    amount: z.coerce.number().positive().finite(),
    pin: z.string().min(4).max(12),
});

export const escrowHoldSchema = z
    .object({
        amount: z.coerce.number().positive().finite().optional(),
        serviceId: z.string().uuid().optional(),
        bookingId: z.string().uuid().optional(),
        sessionId: z.string().uuid().optional(),
    })
    .refine((d) => d.serviceId || (d.amount != null && d.amount > 0), {
        message: 'serviceId yoki musbat amount kerak',
    });

export const escrowIdSchema = z.object({
    escrowId: z.string().uuid(),
});

export const bookSessionSchema = z.object({
    expertId: z.string().uuid(),
    amount: z.coerce.number().positive().finite().optional(),
});

export const completeSessionSchema = z.object({
    transactionId: z.string().uuid(),
});

export const botUpdatePhoneSchema = z.object({
    chatId: z.union([z.string(), z.number()]),
    phone: z.string().min(5).max(32),
});
