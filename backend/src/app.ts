import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import morgan from 'morgan';
import { globalLimiter } from './middleware/rateLimit.middleware';
import healthRoutes from './api/routes/health.routes';
import authRoutes from './api/routes/auth.routes';
import tokenRoutes from './api/routes/token.routes';
import serviceRoutes from './api/routes/service.routes';
import escrowRoutes from './api/routes/escrow.routes';
import videoRoutes from './api/routes/video.routes';
import userRoutes from './api/routes/user.routes';
import chatRoutes from './api/routes/chat.routes';
import adminRoutes from './api/routes/admin.routes';
import jobRoutes from './api/routes/job.routes';
import p2pRoutes from './api/routes/p2p.routes';
import mediaRoutes from './api/routes/media.routes';
import expenseRoutes from './api/routes/expense.routes';
import notificationRoutes from './api/routes/notification.routes';
import specialistRoutes from './api/routes/specialist.routes';
import uploadRoutes from './api/routes/upload.routes';
import quizRoutes from './api/routes/quiz.routes';
import livekitRoutes from './api/routes/livekit.routes';
import sessionRoutes from './api/routes/session.routes';
import walletRoutes from './api/routes/wallet.routes';
import listingDealRoutes from './api/routes/listing-deal.routes';
import reviewRoutes from './api/routes/review.routes';
import desktopRoutes from './api/routes/desktop.routes';
import botRoutes from './api/routes/bot.routes';
import botApiRoutes from './api/routes/botApi.routes';
import settlementRoutes from './api/routes/settlement.routes';
import proxyRoutes from './api/routes/proxy.routes';
import cryptoRoutes from './api/routes/crypto.routes';
import { setupSwagger } from './config/swagger';
import { csrfProtect } from './middleware/csrf.middleware';
import { isOriginAllowed, buildCorsAllowlist } from './config/corsOrigins';

const app = express();

const httpCorsOrigins = buildCorsAllowlist(process.env.CORS_ORIGINS);
const isProd = process.env.NODE_ENV === 'production';
if (isProd) {
    console.log('[CORS] HTTP allowlist:', httpCorsOrigins.join(', ') || '(empty)');
}

app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (isOriginAllowed(origin, httpCorsOrigins)) return callback(null, true);
            console.warn(`[CORS REJECTED] Origin: "${origin}"`);
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'X-Bot-Token',
            'X-Bot-Link-Token',
            'X-Bot-Control-Token',
            'X-CSRF-Token',
        ],
    })
);

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'none'"],
                frameAncestors: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
        hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    })
);
app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), payment=(), usb=()');
    next();
});
app.use(csrfProtect);
app.use(globalLimiter);
app.use(morgan(isProd ? 'tiny' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (!isProd || process.env.SWAGGER_ENABLED === 'true') {
    setupSwagger(app);
}

app.get('/api/ping', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/service', serviceRoutes);
app.use('/api', escrowRoutes);
app.use('/api', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/p2p', p2pRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/specialists', specialistRoutes);
app.use('/api', uploadRoutes);
app.use('/api', quizRoutes);
app.use('/api', livekitRoutes);
app.use('/api', sessionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/listing-deals', listingDealRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api', desktopRoutes);
app.use('/api', botRoutes);
app.use('/api', botApiRoutes);
app.use('/api/settlement/v1', settlementRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api', proxyRoutes);

app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

export default app;
