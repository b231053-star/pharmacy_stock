import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const alerts = await prisma.outbox.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ outbox: alerts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.outbox.deleteMany();
    return NextResponse.json({ message: 'Outbox cleared' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
