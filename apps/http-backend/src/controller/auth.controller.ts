import { Request, Response } from 'express';
import { UserSignupSchema, UserLoginSchema } from '@repo/common-zod/types';
import prisma from '@repo/db/client';
import jwt from 'jsonwebtoken';
import { handleError } from '../utils/errorHandler';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const generateToken = (id: string): string => {
	if (!process.env.JWT_SECRET) {
		throw new Error('JWT_SECRET is not configured');
	}
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
	});
};

const sendCookie = (res: Response, token: string) => {
	const cookieOptions = {
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
		httpOnly: true,
		sameSite:
			process.env.COOKIE_SECURE === 'true'
				? ('none' as const)
				: ('lax' as const),
		secure: process.env.COOKIE_SECURE === 'true',
	};
	res.cookie('authToken', token, cookieOptions);
};

export const signup = async (req: Request, res: Response) => {
	try {
		const parsedSchema = UserSignupSchema.safeParse(req.body);

		if (!parsedSchema.success) {
			return handleError(res, 400, 'Invalid signup data');
		}

		const { email, password, name } = parsedSchema.data;

		const existingUser = await prisma.user.findUnique({
			where: { email: email },
		});

		if (existingUser) {
			return handleError(res, 400, 'User already exists');
		}

		const hashPassword = await bcrypt.hash(password, 12);

		const newUser = await prisma.user.create({
			data: {
				email,
				password: hashPassword,
				name,
			},
			select: {
				id: true,
				email: true,
				name: true,
			},
		});

		const token = generateToken(newUser.id);
		sendCookie(res, token);

		res.status(200).json({ user: newUser });
	} catch (error) {
		return handleError(res, 500, 'Failed to signup');
	}
};

export const login = async (req: Request, res: Response) => {
	try {
		const parsedSchema = UserLoginSchema.safeParse(req.body);

		if (!parsedSchema.success) {
			return handleError(res, 400, 'Invalid login data');
		}

		const { email, password } = parsedSchema.data;

		const user = await prisma.user.findUnique({
			where: { email: email },
		});

		if (!user) {
			return handleError(res, 401, 'Invalid email or password');
		}

		const isPasswordCorrect = await bcrypt.compare(password, user.password);

		if (!isPasswordCorrect) {
			return handleError(res, 401, 'Invalid email or password');
		}

		const token = generateToken(user.id);
		sendCookie(res, token);

		const { password: _, ...filteredUser } = user;

		res.status(200).json({ user: filteredUser });
	} catch (error) {
		return handleError(res, 500, 'Failed to login');
	}
};

export const logout = async (req: Request, res: Response) => {
	try {
		res.clearCookie('authToken', {
			httpOnly: true,
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			secure: process.env.NODE_ENV === 'production',
		});
		res.status(200).json({ message: 'Logged out' });
	} catch (error) {
		res.status(500).json({ message: 'Failed to logout' });
	}
};

export const getUser = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.userId;
		if (!userId) {
			return handleError(res, 401, 'Not Authenticated');
		}

		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
			},
		});

		if (!user) {
			return handleError(res, 404, 'User not found');
		}

		res.status(200).json({ user: user });
	} catch (error) {
		console.error('Get user error:', error);
		return handleError(res, 500, 'Failed to get user');
	}
};
