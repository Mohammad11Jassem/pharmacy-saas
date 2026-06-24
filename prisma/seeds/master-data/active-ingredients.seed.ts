import type { PrismaClient } from '../../../src/generated/prisma/client';

const activeIngredients = [
  {
    ingredientName: 'Paracetamol',
    description: 'Analgesic and antipyretic active ingredient',
  },
  {
    ingredientName: 'Ibuprofen',
    description: 'Non-steroidal anti-inflammatory active ingredient',
  },
  {
    ingredientName: 'Amoxicillin',
    description: 'Beta-lactam antibiotic active ingredient',
  },
  {
    ingredientName: 'Metformin',
    description: 'Antidiabetic active ingredient',
  },
  {
    ingredientName: 'Amlodipine',
    description: 'Calcium channel blocker active ingredient',
  },
  {
    ingredientName: 'Omeprazole',
    description: 'Proton pump inhibitor active ingredient',
  },
  {
    ingredientName: 'Cetirizine',
    description: 'Antihistamine active ingredient',
  },
  {
    ingredientName: 'Azithromycin',
    description: 'Macrolide antibiotic active ingredient',
  },
  {
    ingredientName: 'Diclofenac',
    description: 'Non-steroidal anti-inflammatory active ingredient',
  },
] as const;

export async function seedActiveIngredients(
  prisma: PrismaClient,
): Promise<void> {
  for (const ingredient of activeIngredients) {
    await prisma.activeIngredient.upsert({
      where: {
        ingredientName: ingredient.ingredientName,
      },
      update: {
        description: ingredient.description,
      },
      create: ingredient,
    });
  }
}