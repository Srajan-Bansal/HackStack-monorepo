import { createClient, RedisClientType } from 'redis';

class RedisClient {
	private static instance: RedisClientType;
	private constructor() {}

	public static getInstance(): RedisClientType {
		if (!RedisClient.instance) {
			RedisClient.instance = createClient({
				url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
			});

			RedisClient.instance.on('connect', () => {
				console.log('✅ Redis connected');
			});

			RedisClient.instance.on('error', () => {
				// Silenced - Redis is optional
			});

			RedisClient.instance.connect().catch((err) => {
				console.error('Failed to connect to Redis:', err);
			});
		}

		return RedisClient.instance;
	}
}

export default RedisClient;
