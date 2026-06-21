import type { PrismaClient } from '../../../src/generated/prisma/client';

const drugCategories = [
  {
    categoryName: 'Antibiotics',
    description: 'Drugs used to treat bacterial infections',
  },
  {
    categoryName: 'Painkillers',
    description: 'Drugs used to relieve pain',
  },
  {
    categoryName: 'Antipyretics',
    description: 'Drugs used to reduce fever',
  },
  {
    categoryName: 'Anti-inflammatory',
    description: 'Drugs used to reduce inflammation',
  },
  {
    categoryName: 'Vitamins',
    description: 'Vitamin and supplement products',
  },
  {
    categoryName: 'Diabetes',
    description: 'Drugs used for diabetes management',
  },
  {
    categoryName: 'Hypertension',
    description: 'Drugs used for blood pressure management',
  },
  {
    categoryName: 'Gastrointestinal',
    description: 'Drugs used for digestive system conditions',
  },
  {
    categoryName: 'Respiratory',
    description: 'Drugs used for respiratory conditions',
  },
  {
    categoryName: 'Allergy',
    description: 'Drugs used for allergy symptoms',
  },
] as const;

export async function seedDrugCategories(prisma: PrismaClient): Promise<void> {
  for (const category of drugCategories) {
    await prisma.drugCategory.upsert({
      where: {
        categoryName: category.categoryName,
      },
      update: {
        description: category.description,
      },
      create: category,
    });
  }
}