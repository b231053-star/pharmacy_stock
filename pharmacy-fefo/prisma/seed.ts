import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  await prisma.batch.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Dr. Pharmacist',
      email: 'admin@pharmacy.com',
      password: hashedPassword,
    },
  });

  const now = new Date();
  const days = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

  // Paracetamol with Expired, Expiring Soon, and Healthy Batches
  const para = await prisma.medicine.create({
    data: {
      name: 'Paracetamol 500mg',
      category: 'Analgesic',
      batches: {
        create: [
          { batchNumber: 'PARA-EXP-01', quantity: 30, expiryDate: days(-10) }, // EXPIRED
          { batchNumber: 'PARA-SOON-02', quantity: 20, expiryDate: days(12) },  // EXPIRING SOON
          { batchNumber: 'PARA-GOOD-03', quantity: 50, expiryDate: days(180) }, // HEALTHY
        ],
      },
    },
  });

  // Amoxicillin
  await prisma.medicine.create({
    data: {
      name: 'Amoxicillin 250mg',
      category: 'Antibiotic',
      batches: {
        create: [
          { batchNumber: 'AMOX-01', quantity: 40, expiryDate: days(45) },
          { batchNumber: 'AMOX-02', quantity: 60, expiryDate: days(90) },
        ],
      },
    },
  });

  // Cetirizine
  await prisma.medicine.create({
    data: {
      name: 'Cetirizine 10mg',
      category: 'Antihistamine',
      batches: {
        create: [
          { batchNumber: 'CET-01', quantity: 15, expiryDate: days(5) }, // EXPIRING VERY SOON
          { batchNumber: 'CET-02', quantity: 80, expiryDate: days(300) },
        ],
      },
    },
  });

  console.log('Seeding complete! User: admin@pharmacy.com / admin123');
}

main().finally(async () => await prisma.$disconnect());