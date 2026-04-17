import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorMiddleware } from './middleware/errorMiddleware';
import { apiLimiter } from './middleware/rateLimiter';
import authRouter from './routes/auth.route';
import problemRouter from './routes/problem.route';
import submissionRouter from './routes/submission.route';
import userRouter from './routes/user.route';
import cookieParser from 'cookie-parser';
import { initKafkaProducer, disconnectKafkaProducer } from './services/kafka.service';
import prisma from '@repo/db/client';
import RedisClient from '@repo/redis-client';

const app = express();

app.use(
	cors({
		origin: process.env.FRONTEND_URL || 'http://localhost:5173',
		credentials: true,
	})
);
app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => {
	res.send('Hello World!');
});

app.use('/api/v1', apiLimiter);

app.use('/api/v1', authRouter);
app.use('/api/v1', problemRouter);
app.use('/api/v1', submissionRouter);
app.use('/api/v1/user', userRouter);

const PORT = process.env.PORT;

const startServer = async () => {
	try {
		// Initialize Redis (optional - app works without it)
		try {
			const redis = RedisClient.getInstance();
			await redis.ping();
			console.log('✅ Redis connected');
		} catch (err) {
			console.warn('⚠️ Redis not available - running without cache');
		}

		// Initialize Kafka producer (optional - submissions won't work without it)
		try {
			await initKafkaProducer();
			console.log('✅ Kafka producer ready');
		} catch (err) {
			console.warn('⚠️ Kafka not available - submissions will be disabled');
		}

		// Start HTTP server
		const server = app.listen(PORT, () => {
			console.log(`✅ Server running on port ${PORT}`);
		});

		// Graceful shutdown handler
		const shutdown = async (signal: string) => {
			console.log(`\n${signal} received, starting graceful shutdown...`);

			// Stop accepting new requests
			server.close(() => {
				console.log('✅ HTTP server closed');
			});

			// Set timeout for forceful shutdown
			setTimeout(() => {
				console.warn('⚠️ Forcefully shutting down after timeout');
				process.exit(1);
			}, 30000);

			try {
				// Flush Kafka messages
				await disconnectKafkaProducer();
				console.log('✅ Kafka producer disconnected');

				// Close database
				await prisma.$disconnect();
				console.log('✅ Database disconnected');

				console.log('✅ Graceful shutdown complete');
				process.exit(0);
			} catch (error) {
				console.error('❌ Error during shutdown:', error);
				process.exit(1);
			}
		};

		process.on('SIGTERM', () => shutdown('SIGTERM'));
		process.on('SIGINT', () => shutdown('SIGINT'));
	} catch (error) {
		console.error('❌ Failed to start server:', error);
		process.exit(1);
	}
};

startServer();
