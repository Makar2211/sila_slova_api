import { PrismaClient, Role } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: Role.OWNER } });
  if (existing) {
    console.log('Owner already exists:', existing.email);
    return;
  }

  const hashedPassword = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.create({
    data: {
      email: 'owner@silaslova.com',
      name: 'Owner',
      password: hashedPassword,
      role: Role.OWNER,
    },
  });

  console.log('Owner created:', owner.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
