// import 'dotenv/config';
// import { PrismaPg } from '@prisma/adapter-pg';
// import { PrismaClient } from '../src/generated/prisma/client';

// const connectionString = process.env.DATABASE_URL;

// if (!connectionString) {
//   throw new Error('DATABASE_URL is not defined');
// }

// const adapter = new PrismaPg({
//   connectionString,
// });

// const prisma = new PrismaClient({
//   adapter,
// });

// async function seedDosageForms() {
//   await prisma.dosageForm.createMany({
//     data: [
//       {
//         dosageFormName: 'Tablet',
//         formCategory: 'SOLID',
//       },
//       {
//         dosageFormName: 'Capsule',
//         formCategory: 'SOLID',
//       },
//       {
//         dosageFormName: 'Syrup',
//         formCategory: 'LIQUID',
//       },
//       {
//         dosageFormName: 'Injection',
//         formCategory: 'INJECTION',
//       },
//       {
//         dosageFormName: 'Cream',
//         formCategory: 'SEMI_SOLID',
//       },
//       {
//         dosageFormName: 'Ointment',
//         formCategory: 'SEMI_SOLID',
//       },
//       {
//         dosageFormName: 'Drops',
//         formCategory: 'LIQUID',
//       },
//     ],
//     skipDuplicates: true,
//   });
// }

// async function seedDrugCategories() {
//   await prisma.drugCategory.createMany({
//     data: [
//       {
//         categoryName: 'Antibiotics',
//         description: 'Drugs used to treat bacterial infections',
//       },
//       {
//         categoryName: 'Painkillers',
//         description: 'Drugs used to relieve pain',
//       },
//       {
//         categoryName: 'Vitamins',
//         description: 'Vitamin and supplement products',
//       },
//       {
//         categoryName: 'Diabetes',
//         description: 'Drugs used for diabetes management',
//       },
//       {
//         categoryName: 'Hypertension',
//         description: 'Drugs used for blood pressure management',
//       },
//       {
//         categoryName: 'Dermatology',
//         description: 'Skin-related medications',
//       },
//     ],
//     skipDuplicates: true,
//   });
// }

// async function seedActiveIngredients() {
//   await prisma.activeIngredient.createMany({
//     data: [
//       {
//         ingredientName: 'Paracetamol',
//         description: 'Analgesic and antipyretic',
//       },
//       {
//         ingredientName: 'Ibuprofen',
//         description: 'Non-steroidal anti-inflammatory drug',
//       },
//       {
//         ingredientName: 'Amoxicillin',
//         description: 'Beta-lactam antibiotic',
//       },
//       {
//         ingredientName: 'Metformin',
//         description: 'Antidiabetic medication',
//       },
//       {
//         ingredientName: 'Amlodipine',
//         description: 'Calcium channel blocker',
//       },
//     ],
//     skipDuplicates: true,
//   });
// }

// async function main() {
//   console.log('Start seeding...');

//   await seedDosageForms();
//   await seedDrugCategories();
//   await seedActiveIngredients();

//   console.log('Seeding completed successfully.');
// }

// main()
//   .catch((error) => {
//     console.error('Seeding failed:', error);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });

import { createPrismaSeedClient } from './seeds/shared/prisma-client';
import {
  hashSeedPassword,
  SEED_PHARMACY_PASSWORD,
  SEED_USER_PASSWORD,
} from './seeds/shared/password';

import { seedRoles } from './seeds/identity/roles.seed';
import { seedUsers } from './seeds/identity/users.seed';
import { seedDemoPharmacy } from './seeds/pharmacies/pharmacies.seed';
import { seedPharmacyDocumentTypes } from './seeds/master-data/pharmacy-document-types.seed';
import { seedDosageForms } from './seeds/master-data/dosage-forms.seed';
import { seedDrugCategories } from './seeds/master-data/drug-categories.seed';
import { seedActiveIngredients } from './seeds/master-data/active-ingredients.seed';
import { seedGeneralDrugs } from './seeds/master-data/general-drugs.seed';
import { seedSubscriptionPlans } from './seeds/master-data/subscription-plans.seed';
import {
  seedDrugCatalog,
  seedPharmacyDrugBatches,
  seedPharmacyDrugCatalog,
} from './seeds/master-data/drug-catalog.seed';
const prisma = createPrismaSeedClient();

async function main() {
  console.log('Starting database seed...');

  await seedRoles();

  await seedPharmacyDocumentTypes(prisma);
  await seedDosageForms(prisma);
  await seedDrugCategories(prisma);
  await seedActiveIngredients(prisma);
  // await seedGeneralDrugs(prisma);
  await seedDrugCatalog(prisma);

  await seedSubscriptionPlans(prisma);

  const userPasswordHash = await hashSeedPassword(SEED_USER_PASSWORD);
  const pharmacyPasswordHash = await hashSeedPassword(SEED_PHARMACY_PASSWORD);

  const users = await seedUsers(prisma, userPasswordHash);

  const demoPharmacy = await seedDemoPharmacy(prisma, {
    pharmacyOwnerId: users.pharmacyOwner.pharmacyOwnerId,
    pharmacyPasswordHash,
  });
  const targetPharmacyIdRaw = process.env.SEED_TARGET_PHARMACY_ID;

  /*
   * If SEED_TARGET_PHARMACY_ID is provided,
   * drugs will be assigned to that pharmacy.
   *
   * Otherwise, the demo pharmacy created by the seed
   * will be used automatically.
   */
  const targetPharmacyId =
    targetPharmacyIdRaw !== undefined
      ? Number(targetPharmacyIdRaw)
      : demoPharmacy.pharmacy.pharmacyId;

  if (!Number.isInteger(targetPharmacyId) || targetPharmacyId < 1) {
    throw new Error('SEED_TARGET_PHARMACY_ID must be a positive integer.');
  }

  const pharmacyDrugsResult = await seedPharmacyDrugCatalog(
    prisma,
    targetPharmacyId,
  );

  const pharmacyBatchesResult = await seedPharmacyDrugBatches(
    prisma,
    targetPharmacyId,
  );
  console.log('\nSeeded pharmacy batches:');

  console.table([
    {
      pharmacyId: targetPharmacyId,

      pharmacyDrugs: pharmacyBatchesResult.pharmacyDrugsCount,

      expectedBatches: pharmacyBatchesResult.expectedBatchesCount,

      createdBatches: pharmacyBatchesResult.createdBatchesCount,

      skippedBatches: pharmacyBatchesResult.skippedBatchesCount,
    },
  ]);
  console.log('Seed completed successfully.');

  console.log('\nUser accounts:');
  console.table([
    {
      role: users.adminUser.accountType,
      email: users.adminUser.email,
      password: SEED_USER_PASSWORD,
      loginCode: users.adminUser.loginCode,
    },
    {
      role: users.pharmacyOwnerUser.accountType,
      email: users.pharmacyOwnerUser.email,
      password: SEED_USER_PASSWORD,
      loginCode: users.pharmacyOwnerUser.loginCode,
    },
    {
      role: users.medicalTeamUser.accountType,
      email: users.medicalTeamUser.email,
      password: SEED_USER_PASSWORD,
      loginCode: users.medicalTeamUser.loginCode,
    },
  ]);

  console.log('\nPharmacy account:');
  console.table([
    {
      role: 'PHARMACY',
      pharmacyName: demoPharmacy.pharmacy.pharmacyName,
      pharmacyCode: demoPharmacy.pharmacy.pharmacyCode,
      loginCode: demoPharmacy.credential.loginCode,
      password: SEED_PHARMACY_PASSWORD,
      status: demoPharmacy.pharmacy.status,
    },
  ]);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
