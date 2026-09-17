import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringSoon = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: {
          gt: now,
          lte: thirtyDaysLater,
        },
      },
      include: { medicine: true },
      orderBy: { expiryDate: 'asc' },
    });

    const expired = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: { lte: now },
      },
      include: { medicine: true },
      orderBy: { expiryDate: 'asc' },
    });

    return NextResponse.json({ expiringSoon, expired });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
