import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseQuantity(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw > 0 ? Math.floor(raw) : null;
  if (typeof raw === 'string') {
    const match = raw.match(/\d+/);
    if (match) {
      const val = parseInt(match[0], 10);
      return val > 0 ? val : null;
    }
  }
  return null;
}

function parseDate(raw: any): Date | null {
  if (!raw) return null;
  const str = String(raw).trim();

  // Parse DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const standardDate = new Date(str);
  return isNaN(standardDate.getTime()) ? null : standardDate;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows: any[] = Array.isArray(body) ? body : body.batches || body.data || [];

    let imported = 0;
    let deduped = 0;
    let rejected = 0;
    const errors: any[] = [];
    const seenBatchKeys = new Set<string>();

    for (const [index, row] of rows.entries()) {
      const medicineName = row.medicineName || row.medicine || row.name;
      const batchNumber = row.batchNumber || row.batch || row.batchNo;
      const parsedQty = parseQuantity(row.quantity || row.qty || row.units);
      const parsedExpiry = parseDate(row.expiryDate || row.expiry || row.exp);

      if (!medicineName || !batchNumber || parsedQty === null || !parsedExpiry) {
        rejected++;
        errors.push({ row: index + 1, reason: 'Invalid or missing fields', rowData: row });
        continue;
      }

      const key = `${String(medicineName).trim().toLowerCase()}_${String(batchNumber).trim().toLowerCase()}`;

      if (seenBatchKeys.has(key)) {
        deduped++;
        continue;
      }
      seenBatchKeys.add(key);

      let medicine = await prisma.medicine.findFirst({
        where: { name: { equals: String(medicineName).trim() } },
      });

      if (!medicine) {
        medicine = await prisma.medicine.create({
          data: { name: String(medicineName).trim() },
        });
      }

      const existingBatch = await prisma.batch.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId: medicine.id,
            batchNumber: String(batchNumber).trim(),
          },
        },
      });

      if (existingBatch) {
        deduped++;
        continue;
      }

      await prisma.batch.create({
        data: {
          medicineId: medicine.id,
          batchNumber: String(batchNumber).trim(),
          quantity: parsedQty,
          expiryDate: parsedExpiry,
          status: parsedExpiry <= new Date() ? 'QUARANTINED' : 'ACTIVE',
        },
      });

      imported++;
    }

    return NextResponse.json({
      imported,
      deduped,
      rejected,
      details: { errors },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
