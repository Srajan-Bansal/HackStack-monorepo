import { Request, Response } from 'express';
import prisma, {
	ProblemStatus,
	DefaultCodeType,
	SubmissionStatus,
	TestCaseStatus,
} from '@repo/db/client';
import { SubmissionInputSchema } from '@repo/common-zod/types';
import { handleError } from '../utils/errorHandler';
import { LanguageMapping } from '@repo/language/LanguageMapping';
import { getProblemCode } from '../utils/getProblemCode';
import { sendCodeExecution, isKafkaReady } from '../services/kafka.service';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const createSubmission = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { code, languageId } = SubmissionInputSchema.parse(req.body);
		const problemSlug = req.params.problemSlug as string;
		const userId = req.userId;

		if (!userId) {
			return handleError(res, 401, 'User authentication required');
		}

		if (!isKafkaReady()) {
			return handleError(res, 503, 'Code execution service is currently unavailable');
		}

		const languageInternalId = LanguageMapping[languageId]?.internal;
		if (!languageInternalId) {
			return handleError(res, 400, 'Invalid language');
		}

		// Fetch problem and boilerplate code
		const dbProblem = await prisma.problem.findUnique({
			where: { slug: problemSlug },
			select: {
				id: true,
				DefaultCode: {
					where: {
						languageId: languageInternalId,
						DefaultCodeType: DefaultCodeType.FULLBOILERPLATECODE,
					},
					select: { code: true },
				},
			},
		});

		if (!dbProblem) {
			return handleError(res, 404, 'Problem not found');
		}

		const fullBoilerPlate = dbProblem.DefaultCode[0]?.code;
		if (!fullBoilerPlate) {
			return handleError(res, 404, 'Boilerplate code not found for this language');
		}

		const problem = await getProblemCode(problemSlug, languageId);

		const fullCode = fullBoilerPlate.replace('##USER_CODE_HERE##', code);

		const submissionId = await prisma.$transaction(async (tx: any) => {
			await tx.userProblem.upsert({
				where: {
					userId_problemId: {
						userId,
						problemId: dbProblem.id,
					},
				},
				create: {
					userId,
					problemId: dbProblem.id,
					status: ProblemStatus.ATTEMPTED,
				},
				update: {},
			});

			const submission = await tx.submission.create({
				data: {
					userId,
					problemId: dbProblem.id,
					languageId: languageInternalId,
					code,
					fullCode,
					status: SubmissionStatus.PENDING,
				},
			});

			await tx.testCase.createMany({
				data: problem.inputs.map((input, index) => ({
					submissionId: submission.id,
					status: TestCaseStatus.PENDING,
					input,
					output: problem.outputs[index] ?? '',
					index,
				})),
			});

			return submission.id;
		});

		await sendCodeExecution({
			language: languageId,
			code: fullCode,
			problemId: dbProblem.id,
			problemName: problemSlug,
			userId: userId,
			submissionId: submissionId,
		});

		res.status(200).json({
			submissionId,
			totalTestCases: problem.inputs.length,
		});
	} catch (error) {
		console.error('Error creating submission:', error);
		return handleError(res, 500, (error as Error).message);
	}
};

export const checkSubmission = async (req: Request, res: Response) => {
	try {
		const submissionId = req.query.submission_id as string;

		if (!submissionId) {
			return handleError(res, 400, 'Submission ID is required');
		}

		const submission = await prisma.submission.findUnique({
			where: { id: submissionId },
			select: {
				status: true,
				runtime: true,
				memory: true,
				TestCases: {
					select: {
						index: true,
						status: true,
						runtime: true,
						memory: true,
					},
					orderBy: { index: 'asc' },
				},
			},
		});

		if (!submission) {
			return handleError(res, 404, 'Submission not found');
		}

		res.status(200).json({
			status: submission.status,
			runtime: submission.runtime,
			memory: submission.memory,
			testCases: submission.TestCases,
		});
	} catch (error) {
		console.error('Error checking submission:', error);
		return handleError(res, 500, 'Failed to check submission status');
	}
};

export const getUserSubmissions = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.userId;
		const problemSlug = req.params.problemSlug as string;

		if (!userId) {
			return handleError(res, 401, 'User authentication required');
		}

		if (!problemSlug) {
			return handleError(res, 400, 'Problem slug is required');
		}

		const submissions = await prisma.submission.findMany({
			where: {
				userId,
				Problem: { slug: problemSlug },
			},
			select: {
				id: true,
				status: true,
				runtime: true,
				memory: true,
				languageId: true,
				Language: {
					select: {
						name: true,
					},
				},
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
		});

		res.status(200).json(submissions);
	} catch (error) {
		console.error('Error fetching user submissions:', error);
		return handleError(res, 500, 'Failed to fetch user submissions');
	}
};
