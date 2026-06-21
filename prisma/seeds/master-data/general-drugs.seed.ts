import type { PrismaClient } from '../../../src/generated/prisma/client';
import { DrugSource } from '../../../src/generated/prisma/client';

type GeneralDrugSeed = {
  tradeName: string;
  barcode: string;
  dosageFormName: string;
  unitsPerBox: number;
  netPrice: string;
  consumerPrice: string;
  isRx: boolean;
  ingredients: Array<{
    ingredientName: string;
    strengthValue: string;
    unit: string;
  }>;
  categories: string[];
};

const generalDrugs: GeneralDrugSeed[] = [
  {
    tradeName: 'Panadol 500mg',
    barcode: 'GD-000000000001',
    dosageFormName: 'Tablet',
    unitsPerBox: 24,
    netPrice: '18000.00',
    consumerPrice: '22000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Paracetamol',
        strengthValue: '500.000',
        unit: 'mg',
      },
    ],
    categories: ['Painkillers', 'Antipyretics'],
  },
  {
    tradeName: 'Brufen 400mg',
    barcode: 'GD-000000000002',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '25000.00',
    consumerPrice: '30000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Ibuprofen',
        strengthValue: '400.000',
        unit: 'mg',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
  {
    tradeName: 'Amoxicillin 500mg',
    barcode: 'GD-000000000003',
    dosageFormName: 'Capsule',
    unitsPerBox: 20,
    netPrice: '35000.00',
    consumerPrice: '42000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Amoxicillin',
        strengthValue: '500.000',
        unit: 'mg',
      },
    ],
    categories: ['Antibiotics'],
  },
  {
    tradeName: 'Metformin 500mg',
    barcode: 'GD-000000000004',
    dosageFormName: 'Tablet',
    unitsPerBox: 30,
    netPrice: '22000.00',
    consumerPrice: '27000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Metformin',
        strengthValue: '500.000',
        unit: 'mg',
      },
    ],
    categories: ['Diabetes'],
  },
  {
    tradeName: 'Amlodipine 5mg',
    barcode: 'GD-000000000005',
    dosageFormName: 'Tablet',
    unitsPerBox: 30,
    netPrice: '20000.00',
    consumerPrice: '26000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Amlodipine',
        strengthValue: '5.000',
        unit: 'mg',
      },
    ],
    categories: ['Hypertension'],
  },
  {
    tradeName: 'Omeprazole 20mg',
    barcode: 'GD-000000000006',
    dosageFormName: 'Capsule',
    unitsPerBox: 14,
    netPrice: '28000.00',
    consumerPrice: '34000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Omeprazole',
        strengthValue: '20.000',
        unit: 'mg',
      },
    ],
    categories: ['Gastrointestinal'],
  },
  {
    tradeName: 'Cetirizine 10mg',
    barcode: 'GD-000000000007',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '15000.00',
    consumerPrice: '19000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Cetirizine',
        strengthValue: '10.000',
        unit: 'mg',
      },
    ],
    categories: ['Allergy', 'Respiratory'],
  },
  {
    tradeName: 'Azithromycin 500mg',
    barcode: 'GD-000000000008',
    dosageFormName: 'Tablet',
    unitsPerBox: 3,
    netPrice: '30000.00',
    consumerPrice: '38000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Azithromycin',
        strengthValue: '500.000',
        unit: 'mg',
      },
    ],
    categories: ['Antibiotics'],
  },
];

export async function seedGeneralDrugs(prisma: PrismaClient): Promise<void> {
  for (const seedDrug of generalDrugs) {
    const dosageForm = await prisma.dosageForm.findUnique({
      where: {
        dosageFormName: seedDrug.dosageFormName,
      },
      select: {
        dosageFormId: true,
      },
    });

    if (!dosageForm) {
      throw new Error(`Dosage form not found: ${seedDrug.dosageFormName}`);
    }

    const generalDrug = await prisma.generalDrug.upsert({
      where: {
        barcode: seedDrug.barcode,
      },
      update: {
        dosageForm: {
          connect: {
            dosageFormId: dosageForm.dosageFormId,
          },
        },
        tradeName: seedDrug.tradeName,
        unitsPerBox: seedDrug.unitsPerBox,
        netPrice: seedDrug.netPrice,
        consumerPrice: seedDrug.consumerPrice,
        isRx: seedDrug.isRx,
        isActive: true,
      },
      create: {
        drug: {
          create: {
            source: DrugSource.GENERAL,
          },
        },
        dosageForm: {
          connect: {
            dosageFormId: dosageForm.dosageFormId,
          },
        },
        tradeName: seedDrug.tradeName,
        barcode: seedDrug.barcode,
        unitsPerBox: seedDrug.unitsPerBox,
        netPrice: seedDrug.netPrice,
        consumerPrice: seedDrug.consumerPrice,
        isRx: seedDrug.isRx,
        isActive: true,
      },
      select: {
        generalDrugId: true,
      },
    });

    for (const seedIngredient of seedDrug.ingredients) {
      const ingredient = await prisma.activeIngredient.findUnique({
        where: {
          ingredientName: seedIngredient.ingredientName,
        },
        select: {
          ingredientId: true,
        },
      });

      if (!ingredient) {
        throw new Error(
          `Active ingredient not found: ${seedIngredient.ingredientName}`,
        );
      }

      await prisma.drugIngredient.upsert({
        where: {
          generalDrugId_ingredientId_unit: {
            generalDrugId: generalDrug.generalDrugId,
            ingredientId: ingredient.ingredientId,
            unit: seedIngredient.unit,
          },
        },
        update: {
          strengthValue: seedIngredient.strengthValue,
        },
        create: {
          generalDrug: {
            connect: {
              generalDrugId: generalDrug.generalDrugId,
            },
          },
          ingredient: {
            connect: {
              ingredientId: ingredient.ingredientId,
            },
          },
          strengthValue: seedIngredient.strengthValue,
          unit: seedIngredient.unit,
        },
      });
    }

    for (const categoryName of seedDrug.categories) {
      const category = await prisma.drugCategory.findUnique({
        where: {
          categoryName,
        },
        select: {
          categoryId: true,
        },
      });

      if (!category) {
        throw new Error(`Drug category not found: ${categoryName}`);
      }

      await prisma.drugCategoryAssignment.upsert({
        where: {
          generalDrugId_categoryId: {
            generalDrugId: generalDrug.generalDrugId,
            categoryId: category.categoryId,
          },
        },
        update: {},
        create: {
          generalDrug: {
            connect: {
              generalDrugId: generalDrug.generalDrugId,
            },
          },
          category: {
            connect: {
              categoryId: category.categoryId,
            },
          },
        },
      });
    }
  }
}