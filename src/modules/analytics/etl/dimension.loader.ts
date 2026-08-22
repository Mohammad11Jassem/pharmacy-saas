import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

type CurrentDateRow = {
  today: string;
};

type MinDateRow = {
  minDate: string | null;
};

@Injectable()
export class DimensionLoader {
  private readonly logger = new Logger(DimensionLoader.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * تحميل جميع Dimension Tables.
   */
  async load() {
    /*
     * DimDate أولاً.
     */
    await this.loadDates();

    /*
     * DimPharmacy ثانياً.
     */
    await this.loadPharmacies();
  }

  // =====================================================
  // DIM DATE
  // =====================================================

  /**
   * تعبئة جدول:
   *
   * dim_date
   *
   * الجدول يجب أن يحتوي أيام التقويم
   * حتى الأيام التي لا يوجد فيها مبيعات.
   *
   * وهذا مهم جداً لأن:
   *
   * GetSalesTrendUseCase
   *
   * يعتمد على DimDate لإظهار:
   *
   * يوم = 0 مبيعات
   *
   * بدلاً من حذف اليوم من الرسم البياني.
   */
  private async loadDates() {
    this.logger.log('Loading DimDate...');


    const currentDateRows = await this.prisma.$queryRaw<CurrentDateRow[]>`
        SELECT
          CURRENT_DATE::text AS "today"
      `;

    const today = currentDateRows[0].today;

    const currentYear = Number(today.substring(0, 4));

    /*
     * معرفة أقدم تاريخ transaction
     * موجود في النظام.
     *
     * نبحث في:
     *
     * PharmacyInvoice
     * SupplierInvoice
     */
    const minDateRows = await this.prisma.$queryRaw<MinDateRow[]>`
        SELECT
          MIN(source_date)::text AS "minDate"

        FROM (
          SELECT
            "invoice_date" AS source_date
          FROM "pharmacy_invoices"

          UNION ALL

          SELECT
            "invoice_date" AS source_date
          FROM "supplier_invoices"
        ) AS source_dates
      `;

    const minDate = minDateRows[0]?.minDate;

    /*
     * في حال وجود بيانات قديمة
     * نبدأ من أقدم سنة موجودة.
     *
     * وإلا نحتفظ على الأقل بـ 5 سنوات
     * سابقة لتكون تقارير التاريخ متاحة.
     */
    const sourceYear = minDate ? Number(minDate.substring(0, 4)) : currentYear;

    const startYear = Math.min(sourceYear, currentYear - 5);

    /*
     * نضيف أيضاً سنتين للمستقبل.
     *
     * عدد الصفوف قليل جداً بالنسبة
     * لـ Date Dimension.
     */
    const endYear = currentYear + 2;

    const startDate = new Date(Date.UTC(startYear, 0, 1));

    const endDate = new Date(Date.UTC(endYear, 11, 31));

    const rows: Array<{
      dateKey: number;

      fullDate: Date;

      dayOfMonth: number;

      weekNumber: number;

      weekYear: number;

      monthNumber: number;

      yearNumber: number;
    }> = [];

    /*
     * توليد يوم واحد في كل Iteration.
     */
    for (
      const cursor = new Date(startDate);
      cursor <= endDate;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const date = new Date(cursor);

      const year = date.getUTCFullYear();

      const month = date.getUTCMonth() + 1;

      const day = date.getUTCDate();

      /*
       * dateKey بالشكل:
       *
       * 2026-08-21
       *
       * يصبح:
       *
       * 20260821
       */
      const dateKey = year * 10000 + month * 100 + day;

      /*
       * حساب ISO Week.
       */
      const isoWeek = this.getIsoWeek(date);

      rows.push({
        dateKey,

        fullDate: date,

        dayOfMonth: day,

        weekNumber: isoWeek.weekNumber,

        weekYear: isoWeek.weekYear,

        monthNumber: month,

        yearNumber: year,
      });
    }

    /*
     * createMany أسرع بكثير من:
     *
     * upsert داخل loop
     *
     * وبما أن بيانات التاريخ لا تتغير،
     * نحتاج فقط منع التكرار.
     */
    await this.prisma.dimDate.createMany({
      data: rows,

      /*
       * إذا كان التاريخ موجود مسبقاً:
       * تجاهله.
       */
      skipDuplicates: true,
    });

    this.logger.log(`DimDate ready: ${rows.length} calendar dates checked`);
  }

  // =====================================================
  // DIM PHARMACY
  // =====================================================

  /**
   * تعبئة جدول:
   *
   * dim_pharmacy
   *
   */
  private async loadPharmacies() {
    this.logger.log('Loading DimPharmacy...');

    /*
     * لا نحتاج جلب كامل الصيدلية.
     *
     * فقط الحقول الموجودة في Dimension.
     */
    const pharmacies = await this.prisma.pharmacy.findMany({
      select: {
        pharmacyId: true,

        pharmacyName: true,
      },
    });

    for (const pharmacy of pharmacies) {
      /*
       * upsert:
       *
       * إذا pharmacyId موجود:
       * Update.
       *
       * إذا غير موجود:
       * Insert.
       */
      await this.prisma.dimPharmacy.upsert({
        where: {
          pharmacyId: pharmacy.pharmacyId,
        },

        update: {
          /*
           * إذا تغير اسم الصيدلية
           * يتم تحديثه في Dimension.
           */
          pharmacyName: pharmacy.pharmacyName,
        },

        create: {
          pharmacyId: pharmacy.pharmacyId,

          pharmacyName: pharmacy.pharmacyName,
        },
      });
    }

    this.logger.log(
      `DimPharmacy ready: ${pharmacies.length} pharmacies checked`,
    );
  }

  // =====================================================
  // ISO WEEK
  // =====================================================

  /**
   * حساب:
   *
   * weekNumber
   * weekYear
   *
   * حسب ISO-8601.
   */
  private getIsoWeek(sourceDate: Date): {
    weekNumber: number;
    weekYear: number;
  } {
    /*
     * إنشاء نسخة حتى لا نعدل
     * الـ Date الأصلي.
     */
    const date = new Date(
      Date.UTC(
        sourceDate.getUTCFullYear(),

        sourceDate.getUTCMonth(),

        sourceDate.getUTCDate(),
      ),
    );

    /*
     * Sunday في JavaScript = 0.
     *
     * ISO:
     * Monday = 1
     * Sunday = 7
     */
    const dayNumber = date.getUTCDay() || 7;

    /*
     * ننتقل إلى Thursday من نفس الأسبوع.
     *
     * هذا أسلوب ISO لحساب week-year.
     */
    date.setUTCDate(date.getUTCDate() + 4 - dayNumber);

    const weekYear = date.getUTCFullYear();

    const firstDayOfYear = new Date(Date.UTC(weekYear, 0, 1));

    const diffDays = Math.floor(
      (date.getTime() - firstDayOfYear.getTime()) / 86400000,
    );

    const weekNumber = Math.ceil((diffDays + 1) / 7);

    return {
      weekNumber,
      weekYear,
    };
  }
}
