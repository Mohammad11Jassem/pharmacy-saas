import type { PrismaClient } from '../../../src/generated/prisma/client';
import { DrugSource } from '../../../src/generated/prisma/client';

type DrugIngredientSeed = {
  ingredientName: string;
  strengthValue: string;
  unit: string;
};

type DrugSeed = {
  tradeName: string;
  barcode: string;
  dosageFormName: string;
  unitsPerBox: number;
  netPrice: string;
  consumerPrice: string;
  isRx: boolean;
  ingredients: DrugIngredientSeed[];
  categories: string[];
};

/*
 * These are the 20 GENERAL drugs that will be created
 * inside the general drug catalog.
 *
 * The first 10 drugs will later be assigned
 * to the selected pharmacy.
 */
const GENERAL_DRUGS: DrugSeed[] = [
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
  {
    tradeName: 'Diclofenac 50mg',
    barcode: 'GD-000000000009',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '21000.00',
    consumerPrice: '27000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Diclofenac',
        strengthValue: '50.000',
        unit: 'mg',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
  {
    tradeName: 'Paracetamol Syrup 120mg/5ml',
    barcode: 'GD-000000000010',
    dosageFormName: 'Syrup',
    unitsPerBox: 1,
    netPrice: '16000.00',
    consumerPrice: '20000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Paracetamol',
        strengthValue: '120.000',
        unit: 'mg/5ml',
      },
    ],
    categories: ['Painkillers', 'Antipyretics'],
  },
  {
    tradeName: 'Ibuprofen Syrup 100mg/5ml',
    barcode: 'GD-000000000011',
    dosageFormName: 'Syrup',
    unitsPerBox: 1,
    netPrice: '19000.00',
    consumerPrice: '24000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Ibuprofen',
        strengthValue: '100.000',
        unit: 'mg/5ml',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
  {
    tradeName: 'Amoxicillin Suspension 250mg/5ml',
    barcode: 'GD-000000000012',
    dosageFormName: 'Syrup',
    unitsPerBox: 1,
    netPrice: '33000.00',
    consumerPrice: '41000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Amoxicillin',
        strengthValue: '250.000',
        unit: 'mg/5ml',
      },
    ],
    categories: ['Antibiotics'],
  },
  {
    tradeName: 'Amlodipine 10mg',
    barcode: 'GD-000000000013',
    dosageFormName: 'Tablet',
    unitsPerBox: 30,
    netPrice: '26000.00',
    consumerPrice: '32000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Amlodipine',
        strengthValue: '10.000',
        unit: 'mg',
      },
    ],
    categories: ['Hypertension'],
  },
  {
    tradeName: 'Metformin 850mg',
    barcode: 'GD-000000000014',
    dosageFormName: 'Tablet',
    unitsPerBox: 30,
    netPrice: '28000.00',
    consumerPrice: '34000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Metformin',
        strengthValue: '850.000',
        unit: 'mg',
      },
    ],
    categories: ['Diabetes'],
  },
  {
    tradeName: 'Omeprazole 40mg',
    barcode: 'GD-000000000015',
    dosageFormName: 'Capsule',
    unitsPerBox: 14,
    netPrice: '35000.00',
    consumerPrice: '42000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Omeprazole',
        strengthValue: '40.000',
        unit: 'mg',
      },
    ],
    categories: ['Gastrointestinal'],
  },
  {
    tradeName: 'Cetirizine Drops 10mg/ml',
    barcode: 'GD-000000000016',
    dosageFormName: 'Drops',
    unitsPerBox: 1,
    netPrice: '18000.00',
    consumerPrice: '23000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Cetirizine',
        strengthValue: '10.000',
        unit: 'mg/ml',
      },
    ],
    categories: ['Allergy', 'Respiratory'],
  },
  {
    tradeName: 'Diclofenac Gel 1%',
    barcode: 'GD-000000000017',
    dosageFormName: 'Gel',
    unitsPerBox: 1,
    netPrice: '24000.00',
    consumerPrice: '30000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Diclofenac',
        strengthValue: '1.000',
        unit: '%',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
  {
    tradeName: 'Azithromycin Suspension 200mg/5ml',
    barcode: 'GD-000000000018',
    dosageFormName: 'Syrup',
    unitsPerBox: 1,
    netPrice: '32000.00',
    consumerPrice: '40000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Azithromycin',
        strengthValue: '200.000',
        unit: 'mg/5ml',
      },
    ],
    categories: ['Antibiotics'],
  },
  {
    tradeName: 'Paracetamol Injection 10mg/ml',
    barcode: 'GD-000000000019',
    dosageFormName: 'Injection',
    unitsPerBox: 10,
    netPrice: '45000.00',
    consumerPrice: '55000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Paracetamol',
        strengthValue: '10.000',
        unit: 'mg/ml',
      },
    ],
    categories: ['Painkillers', 'Antipyretics'],
  },
  {
    tradeName: 'Ibuprofen 600mg',
    barcode: 'GD-000000000020',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '30000.00',
    consumerPrice: '37000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Ibuprofen',
        strengthValue: '600.000',
        unit: 'mg',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
];

/*
 * These are 20 PRIVATE drugs.
 *
 * Their prices are stored in PharmacyDrug because
 * PrivateDrug itself does not contain price fields.
 */
const PRIVATE_DRUGS: DrugSeed[] = [
  {
    tradeName: 'MediPar 500mg',
    barcode: 'PD-000000000001',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '17500.00',
    consumerPrice: '21500.00',
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
    tradeName: 'PharmaFen 400mg',
    barcode: 'PD-000000000002',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '23000.00',
    consumerPrice: '29000.00',
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
    tradeName: 'AmoxiMed 500mg',
    barcode: 'PD-000000000003',
    dosageFormName: 'Capsule',
    unitsPerBox: 20,
    netPrice: '34000.00',
    consumerPrice: '41500.00',
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
    tradeName: 'GlucoMed 500mg',
    barcode: 'PD-000000000004',
    dosageFormName: 'Tablet',
    unitsPerBox: 30,
    netPrice: '21500.00',
    consumerPrice: '26500.00',
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
    tradeName: 'PressDown 5mg',
    barcode: 'PD-000000000005',
    dosageFormName: 'Tablet',
    unitsPerBox: 30,
    netPrice: '19500.00',
    consumerPrice: '25000.00',
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
    tradeName: 'GastroSafe 20mg',
    barcode: 'PD-000000000006',
    dosageFormName: 'Capsule',
    unitsPerBox: 14,
    netPrice: '27000.00',
    consumerPrice: '33500.00',
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
    tradeName: 'AllerFree 10mg',
    barcode: 'PD-000000000007',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '14500.00',
    consumerPrice: '18500.00',
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
    tradeName: 'Azimac 500mg',
    barcode: 'PD-000000000008',
    dosageFormName: 'Tablet',
    unitsPerBox: 3,
    netPrice: '29500.00',
    consumerPrice: '37000.00',
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
  {
    tradeName: 'DicloFast 50mg',
    barcode: 'PD-000000000009',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '20500.00',
    consumerPrice: '26000.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Diclofenac',
        strengthValue: '50.000',
        unit: 'mg',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
  {
    tradeName: 'FeverLess Syrup',
    barcode: 'PD-000000000010',
    dosageFormName: 'Syrup',
    unitsPerBox: 1,
    netPrice: '15500.00',
    consumerPrice: '19500.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Paracetamol',
        strengthValue: '120.000',
        unit: 'mg/5ml',
      },
    ],
    categories: ['Painkillers', 'Antipyretics'],
  },
  {
    tradeName: 'IbuCare Syrup',
    barcode: 'PD-000000000011',
    dosageFormName: 'Syrup',
    unitsPerBox: 1,
    netPrice: '18500.00',
    consumerPrice: '23500.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Ibuprofen',
        strengthValue: '100.000',
        unit: 'mg/5ml',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
  {
    tradeName: 'AmoxiCare Suspension',
    barcode: 'PD-000000000012',
    dosageFormName: 'Syrup',
    unitsPerBox: 1,
    netPrice: '32500.00',
    consumerPrice: '40000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Amoxicillin',
        strengthValue: '250.000',
        unit: 'mg/5ml',
      },
    ],
    categories: ['Antibiotics'],
  },
  {
    tradeName: 'PressDown 10mg',
    barcode: 'PD-000000000013',
    dosageFormName: 'Tablet',
    unitsPerBox: 30,
    netPrice: '25000.00',
    consumerPrice: '31500.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Amlodipine',
        strengthValue: '10.000',
        unit: 'mg',
      },
    ],
    categories: ['Hypertension'],
  },
  {
    tradeName: 'GlucoMed 850mg',
    barcode: 'PD-000000000014',
    dosageFormName: 'Tablet',
    unitsPerBox: 30,
    netPrice: '27500.00',
    consumerPrice: '33500.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Metformin',
        strengthValue: '850.000',
        unit: 'mg',
      },
    ],
    categories: ['Diabetes'],
  },
  {
    tradeName: 'GastroSafe 40mg',
    barcode: 'PD-000000000015',
    dosageFormName: 'Capsule',
    unitsPerBox: 14,
    netPrice: '34500.00',
    consumerPrice: '41500.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Omeprazole',
        strengthValue: '40.000',
        unit: 'mg',
      },
    ],
    categories: ['Gastrointestinal'],
  },
  {
    tradeName: 'AllerFree Drops',
    barcode: 'PD-000000000016',
    dosageFormName: 'Drops',
    unitsPerBox: 1,
    netPrice: '17500.00',
    consumerPrice: '22500.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Cetirizine',
        strengthValue: '10.000',
        unit: 'mg/ml',
      },
    ],
    categories: ['Allergy', 'Respiratory'],
  },
  {
    tradeName: 'DicloFast Gel',
    barcode: 'PD-000000000017',
    dosageFormName: 'Gel',
    unitsPerBox: 1,
    netPrice: '23500.00',
    consumerPrice: '29500.00',
    isRx: false,
    ingredients: [
      {
        ingredientName: 'Diclofenac',
        strengthValue: '1.000',
        unit: '%',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
  {
    tradeName: 'Azimac Suspension',
    barcode: 'PD-000000000018',
    dosageFormName: 'Syrup',
    unitsPerBox: 1,
    netPrice: '31500.00',
    consumerPrice: '39500.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Azithromycin',
        strengthValue: '200.000',
        unit: 'mg/5ml',
      },
    ],
    categories: ['Antibiotics'],
  },
  {
    tradeName: 'MediPar Injection',
    barcode: 'PD-000000000019',
    dosageFormName: 'Injection',
    unitsPerBox: 10,
    netPrice: '44000.00',
    consumerPrice: '54000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Paracetamol',
        strengthValue: '10.000',
        unit: 'mg/ml',
      },
    ],
    categories: ['Painkillers', 'Antipyretics'],
  },
  {
    tradeName: 'PharmaFen 600mg',
    barcode: 'PD-000000000020',
    dosageFormName: 'Tablet',
    unitsPerBox: 20,
    netPrice: '29000.00',
    consumerPrice: '36000.00',
    isRx: true,
    ingredients: [
      {
        ingredientName: 'Ibuprofen',
        strengthValue: '600.000',
        unit: 'mg',
      },
    ],
    categories: ['Painkillers', 'Anti-inflammatory'],
  },
];

type MasterDataMaps = {
  dosageForms: Map<string, number>;
  ingredients: Map<string, number>;
  categories: Map<string, number>;
};

function getRequiredId(
  map: Map<string, number>,
  key: string,
  entityName: string,
): number {
  const id = map.get(key);

  if (!id) {
    throw new Error(`${entityName} not found: ${key}`);
  }

  return id;
}

/*
 * Load lookup tables once instead of querying them
 * separately for every drug.
 */
async function loadMasterDataMaps(
  prisma: PrismaClient,
): Promise<MasterDataMaps> {
  const [dosageForms, ingredients, categories] = await Promise.all([
    prisma.dosageForm.findMany({
      select: {
        dosageFormId: true,
        dosageFormName: true,
      },
    }),

    prisma.activeIngredient.findMany({
      select: {
        ingredientId: true,
        ingredientName: true,
      },
    }),

    prisma.drugCategory.findMany({
      select: {
        categoryId: true,
        categoryName: true,
      },
    }),
  ]);

  return {
    dosageForms: new Map(
      dosageForms.map((item) => [
        item.dosageFormName,
        item.dosageFormId,
      ]),
    ),

    ingredients: new Map(
      ingredients.map((item) => [
        item.ingredientName,
        item.ingredientId,
      ]),
    ),

    categories: new Map(
      categories.map((item) => [
        item.categoryName,
        item.categoryId,
      ]),
    ),
  };
}

async function seedOneGeneralDrug(
  prisma: PrismaClient,
  seed: DrugSeed,
  maps: MasterDataMaps,
): Promise<void> {
  const dosageFormId = getRequiredId(
    maps.dosageForms,
    seed.dosageFormName,
    'Dosage form',
  );

  const generalDrug = await prisma.generalDrug.upsert({
    where: {
      barcode: seed.barcode,
    },

    update: {
      dosageForm: {
        connect: {
          dosageFormId,
        },
      },

      tradeName: seed.tradeName,
      unitsPerBox: seed.unitsPerBox,
      netPrice: seed.netPrice,
      consumerPrice: seed.consumerPrice,
      isRx: seed.isRx,
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
          dosageFormId,
        },
      },

      tradeName: seed.tradeName,
      barcode: seed.barcode,
      unitsPerBox: seed.unitsPerBox,
      netPrice: seed.netPrice,
      consumerPrice: seed.consumerPrice,
      isRx: seed.isRx,
      isActive: true,
    },

    select: {
      generalDrugId: true,
    },
  });

  for (const seedIngredient of seed.ingredients) {
    const ingredientId = getRequiredId(
      maps.ingredients,
      seedIngredient.ingredientName,
      'Active ingredient',
    );

    await prisma.drugIngredient.upsert({
      where: {
        generalDrugId_ingredientId_unit: {
          generalDrugId: generalDrug.generalDrugId,
          ingredientId,
          unit: seedIngredient.unit,
        },
      },

      update: {
        strengthValue: seedIngredient.strengthValue,
      },

      create: {
        generalDrugId: generalDrug.generalDrugId,
        ingredientId,
        strengthValue: seedIngredient.strengthValue,
        unit: seedIngredient.unit,
      },
    });
  }

  for (const categoryName of seed.categories) {
    const categoryId = getRequiredId(
      maps.categories,
      categoryName,
      'Drug category',
    );

    await prisma.drugCategoryAssignment.upsert({
      where: {
        generalDrugId_categoryId: {
          generalDrugId: generalDrug.generalDrugId,
          categoryId,
        },
      },

      update: {},

      create: {
        generalDrugId: generalDrug.generalDrugId,
        categoryId,
      },
    });
  }
}

async function seedOnePrivateDrug(
  prisma: PrismaClient,
  seed: DrugSeed,
  maps: MasterDataMaps,
): Promise<void> {
  const dosageFormId = getRequiredId(
    maps.dosageForms,
    seed.dosageFormName,
    'Dosage form',
  );

  const privateDrug = await prisma.privateDrug.upsert({
    where: {
      barcode: seed.barcode,
    },

    update: {
      dosageForm: {
        connect: {
          dosageFormId,
        },
      },

      tradeName: seed.tradeName,
      unitsPerBox: seed.unitsPerBox,
      isRx: seed.isRx,
      isActive: true,
    },

    create: {
      drug: {
        create: {
          source: DrugSource.PRIVATE,
        },
      },

      dosageForm: {
        connect: {
          dosageFormId,
        },
      },

      tradeName: seed.tradeName,
      barcode: seed.barcode,
      unitsPerBox: seed.unitsPerBox,
      isRx: seed.isRx,
      isActive: true,
    },

    select: {
      privateDrugId: true,
    },
  });

  for (const seedIngredient of seed.ingredients) {
    const ingredientId = getRequiredId(
      maps.ingredients,
      seedIngredient.ingredientName,
      'Active ingredient',
    );

    await prisma.privateDrugIngredient.upsert({
      where: {
        privateDrugId_ingredientId: {
          privateDrugId: privateDrug.privateDrugId,
          ingredientId,
        },
      },

      update: {
        strengthValue: seedIngredient.strengthValue,
        unit: seedIngredient.unit,
      },

      create: {
        privateDrugId: privateDrug.privateDrugId,
        ingredientId,
        strengthValue: seedIngredient.strengthValue,
        unit: seedIngredient.unit,
      },
    });
  }

  for (const categoryName of seed.categories) {
    const categoryId = getRequiredId(
      maps.categories,
      categoryName,
      'Drug category',
    );

    await prisma.privateDrugCategoryAssignment.upsert({
      where: {
        privateDrugId_categoryId: {
          privateDrugId: privateDrug.privateDrugId,
          categoryId,
        },
      },

      update: {},

      create: {
        privateDrugId: privateDrug.privateDrugId,
        categoryId,
      },
    });
  }
}

/*
 * Create the master catalog:
 *
 * 20 GENERAL drugs.
 * 20 PRIVATE drugs.
 */
export async function seedDrugCatalog(
  prisma: PrismaClient,
): Promise<void> {
  console.log('Seeding drug catalog...');

  const maps = await loadMasterDataMaps(prisma);

  for (const generalDrug of GENERAL_DRUGS) {
    await seedOneGeneralDrug(prisma, generalDrug, maps);
  }

  for (const privateDrug of PRIVATE_DRUGS) {
    await seedOnePrivateDrug(prisma, privateDrug, maps);
  }

  console.log(
    `Drug catalog seeded: ${GENERAL_DRUGS.length} GENERAL and ${PRIVATE_DRUGS.length} PRIVATE drugs.`,
  );
}

/*
 * Add drugs to one pharmacy:
 *
 * 10 GENERAL drugs.
 * 20 PRIVATE drugs.
 *
 * Total PharmacyDrug rows: 30.
 */
export async function seedPharmacyDrugCatalog(
  prisma: PrismaClient,
  pharmacyId: number,
): Promise<{
  generalAssigned: number;
  privateAssigned: number;
  totalAssigned: number;
}> {
  console.log(`Assigning drugs to pharmacy ${pharmacyId}...`);

  const pharmacy = await prisma.pharmacy.findUnique({
    where: {
      pharmacyId,
    },

    select: {
      pharmacyId: true,
      pharmacyName: true,
    },
  });

  if (!pharmacy) {
    throw new Error(`Target pharmacy not found: ${pharmacyId}`);
  }

  /*
   * Only the first 10 GENERAL drugs are assigned.
   */
  const selectedGeneralSeeds = GENERAL_DRUGS.slice(0, 10);

  const generalBarcodes = selectedGeneralSeeds.map(
    (drug) => drug.barcode,
  );

  const privateBarcodes = PRIVATE_DRUGS.map(
    (drug) => drug.barcode,
  );

  const [generalDrugs, privateDrugs] = await Promise.all([
    prisma.generalDrug.findMany({
      where: {
        barcode: {
          in: generalBarcodes,
        },
      },

      select: {
        drugId: true,
        barcode: true,
        unitsPerBox: true,
        netPrice: true,
        consumerPrice: true,
      },
    }),

    prisma.privateDrug.findMany({
      where: {
        barcode: {
          in: privateBarcodes,
        },
      },

      select: {
        drugId: true,
        barcode: true,
        unitsPerBox: true,
      },
    }),
  ]);

  if (generalDrugs.length !== 10) {
    throw new Error(
      `Expected 10 GENERAL drugs, but found ${generalDrugs.length}.`,
    );
  }

  if (privateDrugs.length !== 20) {
    throw new Error(
      `Expected 20 PRIVATE drugs, but found ${privateDrugs.length}.`,
    );
  }

  const privateSeedByBarcode = new Map(
    PRIVATE_DRUGS.map((drug) => [drug.barcode, drug]),
  );

  /*
   * Assign the selected GENERAL drugs.
   *
   * GeneralDrug already contains prices,
   * so we copy them to PharmacyDrug.
   */
  for (const generalDrug of generalDrugs) {
    await prisma.pharmacyDrug.upsert({
      where: {
        pharmacyId_drugId: {
          pharmacyId,
          drugId: generalDrug.drugId,
        },
      },

      update: {
        minStockAlert: 10,
        sellPart: generalDrug.unitsPerBox > 1,
        netPrice: generalDrug.netPrice,
        consumerPrice: generalDrug.consumerPrice,
        expiryDateAlarm: 60,
        isActive: true,
        notes: 'Seeded GENERAL pharmacy drug',
      },

      create: {
        pharmacyId,
        drugId: generalDrug.drugId,
        minStockAlert: 10,
        sellPart: generalDrug.unitsPerBox > 1,
        netPrice: generalDrug.netPrice,
        consumerPrice: generalDrug.consumerPrice,
        expiryDateAlarm: 60,
        isActive: true,
        notes: 'Seeded GENERAL pharmacy drug',
      },
    });
  }

  /*
   * Assign all PRIVATE drugs.
   *
   * PrivateDrug does not have prices,
   * so the prices are taken from the seed data
   * and stored directly in PharmacyDrug.
   */
  for (const privateDrug of privateDrugs) {
    const seed = privateSeedByBarcode.get(privateDrug.barcode);

    if (!seed) {
      throw new Error(
        `Private drug seed not found for barcode: ${privateDrug.barcode}`,
      );
    }

    await prisma.pharmacyDrug.upsert({
      where: {
        pharmacyId_drugId: {
          pharmacyId,
          drugId: privateDrug.drugId,
        },
      },

      update: {
        minStockAlert: 10,
        sellPart: privateDrug.unitsPerBox > 1,
        netPrice: seed.netPrice,
        consumerPrice: seed.consumerPrice,
        expiryDateAlarm: 60,
        isActive: true,
        notes: 'Seeded PRIVATE pharmacy drug',
      },

      create: {
        pharmacyId,
        drugId: privateDrug.drugId,
        minStockAlert: 10,
        sellPart: privateDrug.unitsPerBox > 1,
        netPrice: seed.netPrice,
        consumerPrice: seed.consumerPrice,
        expiryDateAlarm: 60,
        isActive: true,
        notes: 'Seeded PRIVATE pharmacy drug',
      },
    });
  }

  const result = {
    generalAssigned: generalDrugs.length,
    privateAssigned: privateDrugs.length,
    totalAssigned: generalDrugs.length + privateDrugs.length,
  };

  console.log(
    `Assigned ${result.generalAssigned} GENERAL and ${result.privateAssigned} PRIVATE drugs to ${pharmacy.pharmacyName}.`,
  );

  return result;
}