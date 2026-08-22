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
import { seedAnalyticsHistory } from './seeds/analytics-history.seed';
import { seedPharmacySubscription } from './seeds/master-data/pharmacy-subscription.seed';
const prisma = createPrismaSeedClient();

async function main() {
  console.log('Starting database seed...');

  await seedRoles();

  await seedPharmacyDocumentTypes(prisma);
  await seedDosageForms(prisma);
  await seedDrugCategories(prisma);
  await seedActiveIngredients(prisma);
  // await seedGeneralDrugs(prisma);
  // await seedDrugCatalog(prisma);

  await seedSubscriptionPlans(prisma);

  const userPasswordHash = await hashSeedPassword(SEED_USER_PASSWORD);
  const pharmacyPasswordHash = await hashSeedPassword(SEED_PHARMACY_PASSWORD);

  const users = await seedUsers(prisma, userPasswordHash);

  const demoPharmacy = await seedDemoPharmacy(prisma, {
    pharmacyOwnerId: users.pharmacyOwner.pharmacyOwnerId,
    pharmacyPasswordHash,
  });
  const targetPharmacyIdRaw = process.env.SEED_TARGET_PHARMACY_ID;
  await seedPharmacySubscription(prisma, 1);
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

  // const pharmacyDrugsResult = await seedPharmacyDrugCatalog(
  //   prisma,
  //   targetPharmacyId,
  // );

  // const pharmacyBatchesResult = await seedPharmacyDrugBatches(
  //   prisma,
  //   targetPharmacyId,
  // );
  // console.log('\nSeeded pharmacy batches:');

  // console.table([
  //   {
  //     pharmacyId: targetPharmacyId,

  //     pharmacyDrugs: pharmacyBatchesResult.pharmacyDrugsCount,

  //     expectedBatches: pharmacyBatchesResult.expectedBatchesCount,

  //     createdBatches: pharmacyBatchesResult.createdBatchesCount,

  //     skippedBatches: pharmacyBatchesResult.skippedBatchesCount,
  //   },
  // ]);
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

  // ====================================================
  // ANALYTICS
  // ====================================================

  await seedAnalyticsHistory(prisma);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
