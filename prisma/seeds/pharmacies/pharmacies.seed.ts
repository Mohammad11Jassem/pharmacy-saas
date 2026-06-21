import type { PrismaClient } from '../../../src/generated/prisma/client';
import { PharmacyStatus } from '../../../src/generated/prisma/client';

type SeedDemoPharmacyParams = {
  pharmacyOwnerId: number;
  pharmacyPasswordHash: string;
};

export async function seedDemoPharmacy(
  prisma: PrismaClient,
  params: SeedDemoPharmacyParams,
) {
  const pharmacy = await prisma.pharmacy.upsert({
    where: {
      pharmacyCode: 'PH-SEED-001',
    },
    update: {
      pharmacyOwnerId: params.pharmacyOwnerId,
      pharmacistLicenseNo: 'LIC-SEED-001',
      pharmacyName: 'Seed Pharmacy',
      contactPhone: '0988888888',
      email: 'seed.pharmacy@pharmacy.local',
      governorate: 'Damascus',
      healthDirectorate: 'Damascus Health Directorate',
      areaName: 'Al-Mazzeh',
      addressText: 'Main street, building 10',
      status: PharmacyStatus.ACTIVE,
      openingDate: new Date('2026-01-01'),
    },
    create: {
      pharmacyOwnerId: params.pharmacyOwnerId,
      pharmacistLicenseNo: 'LIC-SEED-001',
      pharmacyName: 'Seed Pharmacy',
      pharmacyCode: 'PH-SEED-001',
      contactPhone: '0988888888',
      email: 'seed.pharmacy@pharmacy.local',
      governorate: 'Damascus',
      healthDirectorate: 'Damascus Health Directorate',
      areaName: 'Al-Mazzeh',
      addressText: 'Main street, building 10',
      status: PharmacyStatus.ACTIVE,
      openingDate: new Date('2026-01-01'),
    },
    select: {
      pharmacyId: true,
      pharmacyOwnerId: true,
      pharmacyName: true,
      pharmacyCode: true,
      status: true,
    },
  });

  const credential = await prisma.pharmacyCredential.upsert({
    where: {
      pharmacyId: pharmacy.pharmacyId,
    },
    update: {
      loginCode: 'PH-SEED-001',
      passwordHash: params.pharmacyPasswordHash,
      lockedUntil: null,
      activatedAt: new Date(),
    },
    create: {
      pharmacyId: pharmacy.pharmacyId,
      loginCode: 'PH-SEED-001',
      passwordHash: params.pharmacyPasswordHash,
      lockedUntil: null,
      activatedAt: new Date(),
    },
    select: {
      pharmacyCredentialId: true,
      pharmacyId: true,
      loginCode: true,
      activatedAt: true,
    },
  });

  return {
    pharmacy,
    credential,
  };
}