import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signSessionToken, verifySessionToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, email, password, name } = body;

    // 1. Session Check Action
    if (action === 'session') {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/session_token=([^;]+)/);
      const token = match ? match[1] : null;

      if (!token) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }

      const session = await verifySessionToken(token);
      if (!session) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }

      return NextResponse.json({ authenticated: true, user: session });
    }

    // 2. Logout Action
    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Logged out' });
      response.cookies.set('session_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
      return response;
    }

    // Validation for register and login
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // 3. Register Action
    if (action === 'register') {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || 'Pharmacist',
        },
      });

      const token = await signSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
      });

      response.cookies.set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      });

      return response;
    }

    // 4. Login Action
    if (action === 'login') {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const token = await signSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
      });

      response.cookies.set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
