import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const medicineId = searchParams.get('medicineId');

    const batches = await prisma.batch.findMany({
      where: medicineId ? { medicineId } : undefined,
      include: {
        medicine: true,
      },
      orderBy: { expiryDate: 'asc' },
    });

    return NextResponse.json({ data: batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { medicineId, batchNumber, quantity, expiryDate } = body;

    // Validation
    if (!medicineId || !batchNumber || quantity === undefined || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields: medicineId, batchNumber, quantity, expiryDate' },
        { status: 400 }
      );
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive integer' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(expiryDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expiry date format' },
        { status: 400 }
      );
    }

    // Verify medicine exists
    const medicine = await prisma.medicine.findUnique({
      where: { id: medicineId },
    });

    if (!medicine) {
      return NextResponse.json(
        { error: 'Medicine not found' },
        { status: 404 }
      );
    }

    // Create batch
    const newBatch = await prisma.batch.create({
      data: {
        medicineId,
        batchNumber: batchNumber.trim(),
        quantity: parsedQty,
        expiryDate: parsedDate,
      },
    });

    return NextResponse.json(newBatch, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}