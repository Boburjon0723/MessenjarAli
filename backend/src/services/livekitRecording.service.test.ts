import { afterEach, describe, expect, it } from 'vitest';
import {
    buildRecordingStagingKey,
    isLiveKitRecordingConfigured,
    liveKitHttpHost,
    publicUrlForStagingKey,
} from '../services/livekitRecording.service';

describe('livekitRecording.service', () => {
    const env = { ...process.env };

    afterEach(() => {
        process.env = { ...env };
    });

    it('converts wss LIVEKIT_URL to https host', () => {
        process.env.LIVEKIT_URL = 'wss://mali.livekit.cloud/';
        expect(liveKitHttpHost()).toBe('https://mali.livekit.cloud');
    });

    it('converts ws LIVEKIT_URL to http host', () => {
        process.env.LIVEKIT_URL = 'ws://localhost:7880';
        expect(liveKitHttpHost()).toBe('http://localhost:7880');
    });

    it('returns null when LIVEKIT_URL missing', () => {
        delete process.env.LIVEKIT_URL;
        expect(liveKitHttpHost()).toBeNull();
    });

    it('isLiveKitRecordingConfigured requires all keys', () => {
        delete process.env.LIVEKIT_URL;
        delete process.env.LIVEKIT_API_KEY;
        delete process.env.LIVEKIT_API_SECRET;
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        delete process.env.LIVEKIT_RECORDINGS_BUCKET;
        expect(isLiveKitRecordingConfigured()).toBe(false);

        process.env.LIVEKIT_URL = 'wss://x.livekit.cloud';
        process.env.LIVEKIT_API_KEY = 'key';
        process.env.LIVEKIT_API_SECRET = 'secret';
        process.env.AWS_ACCESS_KEY_ID = 'AKIA';
        process.env.AWS_SECRET_ACCESS_KEY = 'sec';
        process.env.LIVEKIT_RECORDINGS_BUCKET = 'bucket';
        expect(isLiveKitRecordingConfigured()).toBe(true);
    });

    it('builds safe staging key', () => {
        const key = buildRecordingStagingKey('sess/../evil id!');
        expect(key.startsWith('mali-lessons/')).toBe(true);
        expect(key).toMatch(/mali-lessons\/sess_+evil_id_+\//);
        expect(key.endsWith('.mp4')).toBe(true);
        expect(key).not.toContain('..');
        expect(key).not.toContain(' ');
    });

    it('builds public URL from base or S3 default', () => {
        process.env.RECORDING_PUBLIC_BASE_URL = 'https://cdn.example.com';
        expect(publicUrlForStagingKey('mali-lessons/a.mp4')).toBe(
            'https://cdn.example.com/mali-lessons/a.mp4'
        );

        delete process.env.RECORDING_PUBLIC_BASE_URL;
        process.env.LIVEKIT_RECORDINGS_BUCKET = 'my-bucket';
        process.env.AWS_REGION = 'eu-west-1';
        expect(publicUrlForStagingKey('file.mp4')).toBe(
            'https://my-bucket.s3.eu-west-1.amazonaws.com/file.mp4'
        );
    });
});
