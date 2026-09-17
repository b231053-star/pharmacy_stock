import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { medicineId, quantity } = await req.json();
    const qtyToDispense = parseInt(quantity, 10);
    const now = new Date();

    if (!qtyToDispense || qtyToDispense <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }

    const validBatches = await prisma.batch.findMany({
      where: {
        medicineId,
        quantity: { gt: 0 },
        expiryDate: { gt: now },
      },
      orderBy: { expiryDate: 'asc' },
    });

    const totalAvailable = validBatches.reduce((sum, b) => sum + b.quantity, 0);

    if (totalAvailable < qtyToDispense) {
      return NextResponse.json(
        { error: `Insufficient sellable stock. Available in-date: ${totalAvailable}` },
        { status: 400 }
      );
    }

    let remaining = qtyToDispense;
    const updates = [];
    const dispensedDetails = [];

    for (const batch of validBatches) {
      if (remaining <= 0) break;

      const take = Math.min(batch.quantity, remaining);
      remaining -= take;

      updates.push(
        prisma.batch.update({
          where: { id: batch.id },
          data: { quantity: batch.quantity - take },
        })
      );

      dispensedDetails.push({
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        deducted: take,
      });
    }

    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      message: `Dispensed ${qtyToDispense} units successfully via FEFO.`,
      batchesDeducted: dispensedDetails,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
