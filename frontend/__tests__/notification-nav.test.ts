import { describe, expect, it } from 'vitest';
import {
    getNotificationChatId,
    notificationTypeLabelKey,
    parseNotificationData,
} from '@/lib/notification-nav';

describe('notification-nav', () => {
    it('parses chatId from object or JSON string', () => {
        expect(getNotificationChatId({ chatId: 'abc' })).toBe('abc');
        expect(getNotificationChatId('{"chat_id":"xyz"}')).toBe('xyz');
        expect(getNotificationChatId(null)).toBeNull();
    });

    it('parseNotificationData handles nested shapes', () => {
        expect(parseNotificationData({ jobId: 'j1' }).jobId).toBe('j1');
    });

    it('maps known notification types to i18n keys', () => {
        expect(notificationTypeLabelKey('new_murojaat')).toBe('notif_type_new_murojaat');
        expect(notificationTypeLabelKey('unknown_type')).toBe('notif_type_default');
    });
});
