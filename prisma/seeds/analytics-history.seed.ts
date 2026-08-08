import { PrismaClient } from '../../src/generated/prisma/client';

// ======================================================
// CONFIG
// ======================================================

const START_YEAR = 2025;
const END_YEAR = 2025;

const PHARMACY_ID = 1;

const PHARMACY_NAME = 'Analytics Test Pharmacy';

const DRUGS = [
  {
    pharmacyDrugId: 1,
    unitPrice: 1500,
    salesFactor: 1.5,
  },
  {
    pharmacyDrugId: 2,
    unitPrice: 2500,
    salesFactor: 1.2,
  },
  {
    pharmacyDrugId: 3,
    unitPrice: 4000,
    salesFactor: 0.9,
  },
  {
    pharmacyDrugId: 4,
    unitPrice: 7500,
    salesFactor: 0.7,
  },
  {
    pharmacyDrugId: 5,
    unitPrice: 12000,
    salesFactor: 1.8,
  },
  {
    pharmacyDrugId: 6,
    unitPrice: 850,
    salesFactor: 0.5,
  },
];

// ======================================================
// TYPES
// ======================================================

type DateSeedInfo = {
  date: Date;
  dateKey: number;
  dayOfMonth: number;
  weekNumber: number;
  weekYear: number;
  monthNumber: number;
  yearNumber: number;
  dayOfWeek: number;
};

// ======================================================
// DATE HELPERS
// ======================================================

function buildDateKey(date: Date): number {
  const year = date.getUTCFullYear();

  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  const day = String(date.getUTCDate()).padStart(2, '0');

  return Number(`${year}${month}${day}`);
}

function getIsoWeek(date: Date): {
  weekNumber: number;
  weekYear: number;
} {
  const tempDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  const dayNumber = tempDate.getUTCDay() || 7;

  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNumber);

  const weekYear = tempDate.getUTCFullYear();

  const firstDayOfYear = new Date(Date.UTC(weekYear, 0, 1));

  const differenceInDays = Math.floor(
    (tempDate.getTime() - firstDayOfYear.getTime()) / 86_400_000,
  );

  const weekNumber = Math.ceil((differenceInDays + 1) / 7);

  return {
    weekNumber,
    weekYear,
  };
}

function generateDates(startYear: number, endYear: number): DateSeedInfo[] {
  const result: DateSeedInfo[] = [];

  const start = new Date(Date.UTC(startYear, 0, 1));

  const end = new Date(Date.UTC(endYear, 11, 31));

  const current = new Date(start);

  while (current.getTime() <= end.getTime()) {
    const date = new Date(current);

    const { weekNumber, weekYear } = getIsoWeek(date);

    result.push({
      date,

      dateKey: buildDateKey(date),

      dayOfMonth: date.getUTCDate(),

      weekNumber,

      weekYear,

      monthNumber: date.getUTCMonth() + 1,

      yearNumber: date.getUTCFullYear(),

      dayOfWeek: date.getUTCDay(),
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}

// ======================================================
// GENERATION HELPERS
// ======================================================

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getDayFactor(dayOfWeek: number): number {
  switch (dayOfWeek) {
    case 0:
      return 0.8;

    case 1:
      return 1;

    case 2:
      return 1.05;

    case 3:
      return 1.1;

    case 4:
      return 1.15;

    case 5:
      return 1.3;

    case 6:
      return 1.2;

    default:
      return 1;
  }
}

function getMonthFactor(monthNumber: number): number {
  return 1 + (monthNumber - 1) * 0.05;
}

function getWeekFactor(weekNumber: number): number {
  switch (weekNumber % 4) {
    case 0:
      return 1;

    case 1:
      return 1.05;

    case 2:
      return 1.1;

    case 3:
      return 0.95;

    default:
      return 1;
  }
}

// ======================================================
// MAIN ANALYTICS SEED
// ======================================================

export async function seedAnalyticsHistory(prisma: PrismaClient) {
  console.log('\n================================');

  console.log('Analytics History Seed Started');

  console.log('================================\n');

  // ====================================================
  // DIM DATE
  // ====================================================

  const dates = generateDates(START_YEAR, END_YEAR);

  await prisma.dimDate.createMany({
    data: dates.map((item) => ({
      dateKey: item.dateKey,

      fullDate: item.date,

      dayOfMonth: item.dayOfMonth,

      weekNumber: item.weekNumber,

      weekYear: item.weekYear,

      monthNumber: item.monthNumber,

      yearNumber: item.yearNumber,
    })),

    skipDuplicates: true,
  });

  console.log(`DimDate ready: ${dates.length}`);

  // ====================================================
  // DIM PHARMACY
  // ====================================================

  const pharmacy = await prisma.dimPharmacy.upsert({
    where: {
      pharmacyId: PHARMACY_ID,
    },

    update: {
      pharmacyName: PHARMACY_NAME,
    },

    create: {
      pharmacyId: PHARMACY_ID,

      pharmacyName: PHARMACY_NAME,
    },
  });

  // ====================================================
  // DELETE OLD TEST FACTS
  // ====================================================

  const firstDateKey = dates[0].dateKey;

  const lastDateKey = dates[dates.length - 1].dateKey;

  await prisma.factDrugSalesDaily.deleteMany({
    where: {
      pharmacyKey: pharmacy.pharmacyKey,

      dateKey: {
        gte: firstDateKey,

        lte: lastDateKey,
      },
    },
  });

  await prisma.factBillsDaily.deleteMany({
    where: {
      pharmacyKey: pharmacy.pharmacyKey,

      dateKey: {
        gte: firstDateKey,

        lte: lastDateKey,
      },
    },
  });

  // ====================================================
  // PREPARE FACT DATA
  // ====================================================

  const drugFacts: Array<{
    dateKey: number;
    pharmacyKey: number;
    pharmacyDrugId: number;
    soldBaseQuantity: number;
    grossSalesAmount: number;
    saleInvoiceCount: number;
  }> = [];

  const billFacts: Array<{
    dateKey: number;
    pharmacyKey: number;
    grossSalesAmount: number;
    discountAmount: number;
    returnAmount: number;
    netSalesAmount: number;
    saleInvoiceCount: number;
    returnInvoiceCount: number;
    damageInvoiceCount: number;
    supplierInvoiceCount: number;
  }> = [];

  // ====================================================
  // GENERATE FACT DATA
  // ====================================================

  for (const date of dates) {
    const dayFactor = getDayFactor(date.dayOfWeek);

    const monthFactor = getMonthFactor(date.monthNumber);

    const weekFactor = getWeekFactor(date.weekNumber);

    let dailyGrossSales = 0;
    let dailySoldQuantity = 0;

    for (const drug of DRUGS) {
      const baseDemand = 5 + (date.dayOfMonth % 7);

      const soldBaseQuantity = Math.max(
        1,

        Math.round(
          baseDemand * drug.salesFactor * dayFactor * monthFactor * weekFactor,
        ),
      );

      const grossSalesAmount = roundMoney(soldBaseQuantity * drug.unitPrice);

      const saleInvoiceCount = Math.max(
        1,

        Math.ceil(soldBaseQuantity / 4),
      );

      drugFacts.push({
        dateKey: date.dateKey,

        pharmacyKey: pharmacy.pharmacyKey,

        pharmacyDrugId: drug.pharmacyDrugId,

        soldBaseQuantity,

        grossSalesAmount,

        saleInvoiceCount,
      });

      dailyGrossSales += grossSalesAmount;

      dailySoldQuantity += soldBaseQuantity;
    }

    // ==================================================
    // BILLS
    // ==================================================

    const saleInvoiceCount = Math.max(
      1,

      Math.ceil(dailySoldQuantity / 8),
    );

    const discountRate = date.dayOfMonth % 3 === 0 ? 0.05 : 0.02;

    const discountAmount = roundMoney(dailyGrossSales * discountRate);

    const hasReturn = date.dayOfMonth % 10 === 0;

    const returnAmount = hasReturn ? roundMoney(dailyGrossSales * 0.06) : 0;

    const netSalesAmount = roundMoney(
      dailyGrossSales - discountAmount - returnAmount,
    );

    const damageInvoiceCount = date.dayOfMonth % 13 === 0 ? 1 : 0;

    const supplierInvoiceCount =
      date.dayOfWeek === 1 || date.dayOfWeek === 4 ? 1 : 0;

    billFacts.push({
      dateKey: date.dateKey,

      pharmacyKey: pharmacy.pharmacyKey,

      grossSalesAmount: roundMoney(dailyGrossSales),

      discountAmount,

      returnAmount,

      netSalesAmount,

      saleInvoiceCount,

      returnInvoiceCount: hasReturn ? 1 : 0,

      damageInvoiceCount,

      supplierInvoiceCount,
    });
  }

  // ====================================================
  // INSERT FACTS
  // ====================================================

  await prisma.factDrugSalesDaily.createMany({
    data: drugFacts,
  });

  await prisma.factBillsDaily.createMany({
    data: billFacts,
  });

  console.log(`FactDrugSalesDaily: ${drugFacts.length}`);

  console.log(`FactBillsDaily: ${billFacts.length}`);

  console.log('\nAnalytics History Seed Completed.');
}
