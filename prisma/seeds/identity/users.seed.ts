import type { PrismaClient } from '../../../src/generated/prisma/client';
import {
  AccountType,
  UserAccountStatus,
} from '../../../src/generated/prisma/client';

type SeedUsersResult = {
  adminUser: {
    userId: number;
    email: string;
    fullName: string;
    accountType: string;
    loginCode: string;
  };

  pharmacyOwnerUser: {
    userId: number;
    email: string;
    fullName: string;
    accountType: string;
    loginCode: string;
  };

  pharmacyOwner: {
    pharmacyOwnerId: number;
    userId: number;
    nationalId: string;
  };

  medicalTeamUser: {
    userId: number;
    email: string;
    fullName: string;
    accountType: string;
    loginCode: string;
  };
};

export async function seedUsers(
  prisma: PrismaClient,
  passwordHash: string,
): Promise<SeedUsersResult> {
  const adminUser = await prisma.userAccount.upsert({
    where: {
      email: 'admin@pharmacy.local',
    },
    update: {
      phone: '0900000001',
      fullName: 'System Admin',
      passwordHash,
      accountType: AccountType.ADMIN,
      status: UserAccountStatus.ACTIVE,
      loginCode: 'ADM-SEED-001',
    },
    create: {
      email: 'admin@pharmacy.local',
      phone: '0900000001',
      fullName: 'System Admin',
      passwordHash,
      accountType: AccountType.ADMIN,
      status: UserAccountStatus.ACTIVE,
      loginCode: 'ADM-SEED-001',
    },
    select: {
      userId: true,
      email: true,
      fullName: true,
      accountType: true,
      loginCode: true,
    },
  });

  const pharmacyOwnerUser = await prisma.userAccount.upsert({
    where: {
      email: 'owner@pharmacy.local',
    },
    update: {
      phone: '0900000002',
      fullName: 'Demo Pharmacy Owner',
      passwordHash,
      accountType: AccountType.PHARMACY_OWNER,
      status: UserAccountStatus.ACTIVE,
      loginCode: 'OWN-SEED-001',
    },
    create: {
      email: 'owner@pharmacy.local',
      phone: '0900000002',
      fullName: 'Demo Pharmacy Owner',
      passwordHash,
      accountType: AccountType.PHARMACY_OWNER,
      status: UserAccountStatus.ACTIVE,
      loginCode: 'OWN-SEED-001',
    },
    select: {
      userId: true,
      email: true,
      fullName: true,
      accountType: true,
      loginCode: true,
    },
  });

  const pharmacyOwner = await prisma.pharmacyOwner.upsert({
    where: {
      nationalId: 'SEED-OWNER-NID-001',
    },
    update: {
      userId: pharmacyOwnerUser.userId,
    },
    create: {
      userId: pharmacyOwnerUser.userId,
      nationalId: 'SEED-OWNER-NID-001',
    },
    select: {
      pharmacyOwnerId: true,
      userId: true,
      nationalId: true,
    },
  });

  const medicalTeamUser = await prisma.userAccount.upsert({
    where: {
      email: 'medical@pharmacy.local',
    },
    update: {
      phone: '0900000003',
      fullName: 'Demo Medical Team User',
      passwordHash,
      accountType: AccountType.MEDICAL_TEAM,
      status: UserAccountStatus.ACTIVE,
      loginCode: 'MED-SEED-001',
    },
    create: {
      email: 'medical@pharmacy.local',
      phone: '0900000003',
      fullName: 'Demo Medical Team User',
      passwordHash,
      accountType: AccountType.MEDICAL_TEAM,
      status: UserAccountStatus.ACTIVE,
      loginCode: 'MED-SEED-001',
    },
    select: {
      userId: true,
      email: true,
      fullName: true,
      accountType: true,
      loginCode: true,
    },
  });

  return {
    adminUser,
    pharmacyOwnerUser,
    pharmacyOwner,
    medicalTeamUser,
  };
}