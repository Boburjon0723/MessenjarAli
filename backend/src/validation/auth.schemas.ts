import { z } from 'zod';

export const registerSchema = z.object({
    phone: z.string().min(5).max(32),
    password: z.string().min(6).max(128),
    name: z.string().min(1).max(100).optional(),
    surname: z.string().min(1).max(100).optional(),
    age: z.coerce.number().int().min(1).max(120).optional(),
});

export const loginSchema = z.object({
    phone: z.string().min(5).max(32),
    password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(10),
});

export const requestResetSchema = z.object({
    phone: z.string().min(5).max(32),
});

export const confirmResetSchema = z.object({
    phone: z.string().min(5).max(32),
    code: z.string().min(4).max(12),
    newPassword: z.string().min(6).max(128),
});
