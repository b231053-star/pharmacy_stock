import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    let now = new Date();
    try {
      const body = await req.json();
      if (body?.now) now = new Date(body.now);
    } catch {}

    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 1. Quarantine expired batches
    const quarantinedResult = await prisma.batch.updateMany({
      where: {
        expiryDate: { lte: now },
        status: { not: 'QUARANTINED' },
      },
      data: { status: 'QUARANTINED' },
    });

    // 2. Flag batches expiring within 7 days
    const expiringSoonResult = await prisma.batch.updateMany({
      where: {
        expiryDate: { gt: now, lte: sevenDaysLater },
        status: 'ACTIVE',
      },
      data: { status: 'EXPIRING_SOON' },
    });

    // 3. Aggregate state counts
    const [totalActive, totalExpiringSoon, totalQuarantined] = await Promise.all([
      prisma.batch.count({ where: { status: 'ACTIVE' } }),
      prisma.batch.count({ where: { status: 'EXPIRING_SOON' } }),
      prisma.batch.count({ where: { status: 'QUARANTINED' } }),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      quarantinedUpdated: quarantinedResult.count,
      expiringSoonUpdated: expiringSoonResult.count,
      counts: {
        active: totalActive,
        expiringSoon: totalExpiringSoon,
        quarantined: totalQuarantined,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
