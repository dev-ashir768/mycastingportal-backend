/**
 * Seed file — runs with: npm run prisma:seed
 * Creates:
 *   1. The single super-admin  (email: admin@yopmail.com / password: 12345678)
 *   2. Three starter roles that actors/filmmakers/reps can pick at signup
 *
 * NOTE: The admin password intentionally bypasses the strict API validation
 * rules (uppercase + special char). Change it via the API after first login.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin(): Promise<string> {
  console.log('Seeding admin...');

  const email = 'admin@gmail.com';
  const plainPassword = 'Admin@123';

  // Hash directly — intentionally bypasses API Joi validation
  const password = await bcrypt.hash(plainPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { password, fullName: 'Super Admin', isActive: true },
    create: {
      fullName: 'Super Admin',
      email,
      password,
      isActive: true,
    },
  });

  console.log(`  Admin upserted → ${admin.email} (id: ${admin.id})`);
  console.log('  ⚠  Default password: 12345678 — change it after first login!');

  return admin.id;
}

async function seedRoles(adminId: string): Promise<void> {
  console.log('Seeding starter roles...');

  const roles = [
    {
      name: 'Actor',
      description: 'Performers who audition for film, TV, theatre, and commercial roles.',
    },
    {
      name: 'Film Maker',
      description: 'Directors, producers, and crew members who create film and TV projects.',
    },
    {
      name: 'Talent Representative',
      description: 'Agents and managers who represent and promote actors.',
    },
  ];

  for (const role of roles) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, deletedAt: null },
    });

    if (existing) {
      console.log(`  Skipped (already exists): ${role.name}`);
      continue;
    }

    const created = await prisma.role.create({
      data: { ...role, isActive: true, createdBy: adminId },
    });
    console.log(`  Created role: ${created.name} (id: ${created.id})`);
  }
}

async function main(): Promise<void> {
  console.log('\n── Actor Agency Seed ────────────────────────────────\n');

  const adminId = await seedAdmin();
  await seedRoles(adminId);

  console.log('\n── Seed completed successfully ──────────────────────\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
