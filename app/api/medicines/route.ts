import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'name';
    const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    const now = new Date();

    const allMedicines = await prisma.medicine.findMany({
      where: {
        name: { contains: search },
      },
      include: {
        batches: true,
      },
      orderBy: { [sort]: order },
    });

    const processed = allMedicines.map((m) => {
      const validBatches = m.batches.filter(b => new Date(b.expiryDate) > now && b.quantity > 0);
      const inDateStock = validBatches.reduce((acc, b) => acc + b.quantity, 0);
      const expiredStock = m.batches
        .filter(b => new Date(b.expiryDate) <= now && b.quantity > 0)
        .reduce((acc, b) => acc + b.quantity, 0);

      return {
        id: m.id,
        name: m.name,
        category: m.category,
        inDateStock,
        expiredStock,
        batches: m.batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
      };
    });

    const total = processed.length;
    const paginated = processed.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, category } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 });
    }
    const medicine = await prisma.medicine.create({
      data: { name: name.trim(), category: category?.trim() || 'General' },
    });
    return NextResponse.json(medicine, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
