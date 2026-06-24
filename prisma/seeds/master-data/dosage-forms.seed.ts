import type { PrismaClient } from '../../../src/generated/prisma/client';
import { DosageFormCategory } from '../../../src/generated/prisma/client';

const dosageForms = [
  {
    dosageFormName: 'Tablet',
    formCategory: DosageFormCategory.SOLID,
  },
  {
    dosageFormName: 'Capsule',
    formCategory: DosageFormCategory.SOLID,
  },
  {
    dosageFormName: 'Syrup',
    formCategory: DosageFormCategory.LIQUID,
  },
  {
    dosageFormName: 'Drops',
    formCategory: DosageFormCategory.LIQUID,
  },
  {
    dosageFormName: 'Injection',
    formCategory: DosageFormCategory.INJECTION,
  },
  {
    dosageFormName: 'Cream',
    formCategory: DosageFormCategory.SEMI_SOLID,
  },
  {
    dosageFormName: 'Ointment',
    formCategory: DosageFormCategory.SEMI_SOLID,
  },
  {
    dosageFormName: 'Gel',
    formCategory: DosageFormCategory.SEMI_SOLID,
  },
  {
    dosageFormName: 'Inhaler',
    formCategory: DosageFormCategory.OTHER,
  },
] as const;

export async function seedDosageForms(prisma: PrismaClient): Promise<void> {
  for (const dosageForm of dosageForms) {
    await prisma.dosageForm.upsert({
      where: {
        dosageFormName: dosageForm.dosageFormName,
      },
      update: {
        formCategory: dosageForm.formCategory,
      },
      create: dosageForm,
    });
  }
}