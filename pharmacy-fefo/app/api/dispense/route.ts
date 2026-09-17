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

    // Unexpired & non-quarantined batches
    const validBatches = await prisma.batch.findMany({
      where: {
        medicineId,
        quantity: { gt: 0 },
        expiryDate: { gt: now },
        status: { not: 'QUARANTINED' },
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

    // Reorder check (Level 3 integration)
    const remainingBatches = await prisma.batch.findMany({
      where: {
        medicineId,
        quantity: { gt: 0 },
        expiryDate: { gt: now },
        status: { not: 'QUARANTINED' },
      },
    });

    const remainingInDateStock = remainingBatches.reduce((acc, b) => acc + b.quantity, 0);
    const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });

    let alertTriggered = false;
    if (medicine && remainingInDateStock < medicine.reorderThreshold) {
      await prisma.outbox.create({
        data: {
          type: 'REORDER_ALERT',
          medicineId: medicine.id,
          payload: JSON.stringify({
            medicineName: medicine.name,
            currentStock: remainingInDateStock,
            reorderThreshold: medicine.reorderThreshold,
            timestamp: new Date().toISOString(),
          }),
        },
      });
      alertTriggered = true;
    }

    return NextResponse.json({
      success: true,
      message: `Dispensed ${qtyToDispense} units successfully via FEFO.`,
      batchesDeducted: dispensedDetails,
      remainingInDateStock,
      reorderAlertTriggered: alertTriggered,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
