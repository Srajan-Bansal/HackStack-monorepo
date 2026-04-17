import { Kafka, Producer } from 'kafkajs';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'hackstack-backend';

const kafka = new Kafka({
	clientId: KAFKA_CLIENT_ID,
	brokers: [KAFKA_BROKER],
	retry: {
		initialRetryTime: 100,
		retries: 8,
	},
});

let producer: Producer;

export const initKafkaProducer = async () => {
	producer = kafka.producer();
	await producer.connect();
	console.log('📡 Kafka producer connected');
};

export interface ExecutorInput {
	language: string;
	code: string;
	problemId: number;
	problemName: string;
	userId: string;
	submissionId: string;
}

export const isKafkaReady = () => !!producer;

export const sendCodeExecution = async (input: ExecutorInput) => {
	if (!producer) {
		throw new Error('Kafka is not available - code execution is disabled');
	}

	await producer.send({
		topic: 'code-executor',
		messages: [
			{
				key: input.submissionId,
				value: JSON.stringify(input),
			},
		],
	});

	console.log(`✅ Sent code execution request for submission: ${input.submissionId}`);
};

export const disconnectKafkaProducer = async () => {
	if (producer) {
		await producer.disconnect();
		console.log('🔌 Kafka producer disconnected');
	}
};
