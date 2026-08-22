import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

type TargetDateRow = {
  targetDate: string;
};

type DailyDrugSalesRow = {
  pharmacyId: number;

  pharmacyDrugId: number;

  soldBaseQuantity: bigint;

  grossSalesAmount: string;

  saleInvoiceCount: number;
};

type DailyBillsRow = {
  pharmacyId: number;

  grossSalesAmount: string;

  discountAmount: string;

  returnAmount: string;

  netSalesAmount: string;

  saleInvoiceCount: number;

  returnInvoiceCount: number;

  damageInvoiceCount: number;

  supplierInvoiceCount: number;
};

@Injectable()
export class FactLoader {
  private readonly logger = new Logger(FactLoader.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * =====================================================
   * تحميل بيانات يوم أمس فقط.
   * =====================================================
   *
   * مثال:
   *
   * اليوم:
   * 2026-08-21
   *
   * سيتم تحميل:
   * 2026-08-20
   */
  async loadYesterday() {
    /*
     * نحسب يوم أمس حسب توقيت دمشق.
     *
     * استخدام PostgreSQL هنا أفضل من:
     *
     * new Date()
     *
     * لأن السيرفر قد يكون موجوداً في دولة
     * أو TimeZone مختلفة.
     */
    const result = await this.prisma.$queryRaw<TargetDateRow[]>`

        SELECT

          (
            (
              CURRENT_TIMESTAMP
              AT TIME ZONE 'Asia/Damascus'
            )::date
            - 1
          )::text

          AS "targetDate"

      `;

    const targetDate = result[0].targetDate;

    await this.loadDate(targetDate);
  }

  /**
   * =====================================================
   * تحميل يوم معين.
   * =====================================================
   *
   * هذا التابع مهم لأنه يجعل ETL reusable.
   *
   * مثلاً:
   *
   * loadDate('2026-08-20')
   *
   * سيعيد بناء Analytics
   * لهذا اليوم فقط.
   */
  async loadDate(targetDate: string) {
    this.logger.log(`Loading Fact tables for ${targetDate}`);

    /*
     * تحويل:
     *
     * 2026-08-20
     *
     * إلى:
     *
     * 20260820
     */
    const dateKey = this.toDateKey(targetDate);

    /*
     * قراءة بيانات اليوم المستهدف فقط.
     */
    const [drugSalesRows, billsRows, pharmacies] = await Promise.all([
      this.getDailyDrugSales(targetDate),

      this.getDailyBills(targetDate),

      /*
       * نحتاج pharmacyKey الخاص
       * بالـ Dimension وليس pharmacyId.
       */
      this.prisma.dimPharmacy.findMany({
        select: {
          pharmacyId: true,
          pharmacyKey: true,
        },
      }),
    ]);

    /*
     * إنشاء Map للوصول بسرعة إلى:
     *
     * pharmacyId
     *      ↓
     * pharmacyKey
     */
    const pharmacyKeyMap = new Map<number, number>();

    for (const pharmacy of pharmacies) {
      pharmacyKeyMap.set(pharmacy.pharmacyId, pharmacy.pharmacyKey);
    }

    /*
     * ===================================================
     * تجهيز FactDrugSalesDaily
     * ===================================================
     */
    const drugFactData = drugSalesRows.map((row) => {
      const pharmacyKey = pharmacyKeyMap.get(row.pharmacyId);

      if (!pharmacyKey) {
        throw new Error(
          `DimPharmacy not found for pharmacyId=${row.pharmacyId}`,
        );
      }

      return {
        dateKey,

        pharmacyKey,

        pharmacyDrugId: row.pharmacyDrugId,

        soldBaseQuantity: Number(row.soldBaseQuantity),

        grossSalesAmount: row.grossSalesAmount,

        saleInvoiceCount: row.saleInvoiceCount,
      };
    });

    /*
     * ===================================================
     * تجهيز FactBillsDaily
     * ===================================================
     */
    const billsFactData = billsRows.map((row) => {
      const pharmacyKey = pharmacyKeyMap.get(row.pharmacyId);

      if (!pharmacyKey) {
        throw new Error(
          `DimPharmacy not found for pharmacyId=${row.pharmacyId}`,
        );
      }

      return {
        dateKey,

        pharmacyKey,

        grossSalesAmount: row.grossSalesAmount,

        discountAmount: row.discountAmount,

        returnAmount: row.returnAmount,

        netSalesAmount: row.netSalesAmount,

        saleInvoiceCount: row.saleInvoiceCount,

        returnInvoiceCount: row.returnInvoiceCount,

        damageInvoiceCount: row.damageInvoiceCount,

        supplierInvoiceCount: row.supplierInvoiceCount,
      };
    });

    /*
     * ===================================================
     * تحديث اليوم المستهدف فقط.
     * ===================================================
     *
     * مهم جداً:
     *
     * لا نحذف Data Warehouse.
     *
     * نحذف فقط:
     *
     * WHERE date_key = 20260820
     *
     * ثم نعيد إدخال نفس اليوم.
     *
     * Transaction تضمن أنه لو حدث خطأ،
     * لن نخسر البيانات القديمة لهذا اليوم.
     */
    await this.prisma.$transaction(async (tx) => {
      /*
       * حذف Drug Facts لهذا اليوم فقط.
       */
      await tx.factDrugSalesDaily.deleteMany({
        where: {
          dateKey,
        },
      });

      /*
       * حذف Bills Facts لهذا اليوم فقط.
       */
      await tx.factBillsDaily.deleteMany({
        where: {
          dateKey,
        },
      });

      /*
       * إعادة تخزين Drug Facts.
       */
      if (drugFactData.length > 0) {
        await tx.factDrugSalesDaily.createMany({
          data: drugFactData,
        });
      }

      /*
       * إعادة تخزين Bills Facts.
       */
      if (billsFactData.length > 0) {
        await tx.factBillsDaily.createMany({
          data: billsFactData,
        });
      }
    });

    this.logger.log(
      `FactDrugSalesDaily: ${drugFactData.length} rows loaded for ${targetDate}`,
    );

    this.logger.log(
      `FactBillsDaily: ${billsFactData.length} rows loaded for ${targetDate}`,
    );
  }

  /**
   * =====================================================
   * FactDrugSalesDaily
   * =====================================================
   *
   * قراءة مبيعات يوم واحد فقط.
   *
   * Grain:
   *
   * Date
   * +
   * Pharmacy
   * +
   * Drug
   */
  private async getDailyDrugSales(targetDate: string) {
    return this.prisma.$queryRaw<DailyDrugSalesRow[]>`

      SELECT

        pi."pharmacy_id"
          AS "pharmacyId",


        sii."pharmacy_drug_id"
          AS "pharmacyDrugId",


        COALESCE(
          SUM(
            sii."base_quantity"
          ),
          0
        )::bigint
          AS "soldBaseQuantity",


        COALESCE(
          SUM(
            sii."total_price"
          ),
          0
        )::text
          AS "grossSalesAmount",


        COUNT(
          DISTINCT
          si."sale_invoice_id"
        )::integer
          AS "saleInvoiceCount"


      FROM
        "pharmacy_invoices" pi


      INNER JOIN
        "sale_invoices" si

        ON
          si."pharmacy_invoice_id"
          =
          pi."pharmacy_invoice_id"


      INNER JOIN
        "sale_invoice_items" sii

        ON
          sii."sale_invoice_id"
          =
          si."sale_invoice_id"


      WHERE

        pi."invoice_type" = 'SALE'

        AND pi."status" = 'POSTED'

        /*
         * أهم شرط في Incremental ETL:
         *
         * لا نقرأ كل تاريخ النظام.
         *
         * فقط اليوم المطلوب.
         */
        AND pi."invoice_date"
          = ${targetDate}::date


      GROUP BY

        pi."pharmacy_id",

        sii."pharmacy_drug_id"


      ORDER BY

        pi."pharmacy_id",

        sii."pharmacy_drug_id"

    `;
  }

  /**
   * =====================================================
   * FactBillsDaily
   * =====================================================
   *
   * قراءة كل نشاط الفواتير
   * الخاص بيوم واحد فقط.
   */
  private async getDailyBills(targetDate: string) {
    return this.prisma.$queryRaw<DailyBillsRow[]>`

      WITH daily_events AS (

        /*
         * =============================================
         * SALES
         * =============================================
         */
        SELECT

          pi."pharmacy_id"
            AS pharmacy_id,


          COALESCE(
            SUM(
              si."subtotal"
            ),
            0
          )::numeric
            AS gross_sales_amount,


          COALESCE(
            SUM(
              si."discount"
            ),
            0
          )::numeric
            AS discount_amount,


          0::numeric
            AS return_amount,


          COUNT(
            si."sale_invoice_id"
          )::integer
            AS sale_invoice_count,


          0::integer
            AS return_invoice_count,


          0::integer
            AS damage_invoice_count,


          0::integer
            AS supplier_invoice_count


        FROM
          "pharmacy_invoices" pi


        INNER JOIN
          "sale_invoices" si

          ON
            si."pharmacy_invoice_id"
            =
            pi."pharmacy_invoice_id"


        WHERE

          pi."invoice_type" = 'SALE'

          AND pi."status" = 'POSTED'

          AND pi."invoice_date"
            = ${targetDate}::date


        GROUP BY
          pi."pharmacy_id"



        UNION ALL



        /*
         * =============================================
         * RETURNS
         * =============================================
         */
        SELECT

          pi."pharmacy_id"
            AS pharmacy_id,


          0::numeric
            AS gross_sales_amount,


          0::numeric
            AS discount_amount,


          COALESCE(
            SUM(
              ri."subtotal_refund"
            ),
            0
          )::numeric
            AS return_amount,


          0::integer
            AS sale_invoice_count,


          COUNT(
            ri."return_invoice_id"
          )::integer
            AS return_invoice_count,


          0::integer
            AS damage_invoice_count,


          0::integer
            AS supplier_invoice_count


        FROM
          "pharmacy_invoices" pi


        INNER JOIN
          "return_invoices" ri

          ON
            ri."pharmacy_invoice_id"
            =
            pi."pharmacy_invoice_id"


        WHERE

          pi."invoice_type" = 'RETURN'

          AND pi."status" = 'POSTED'

          AND pi."invoice_date"
            = ${targetDate}::date


        GROUP BY
          pi."pharmacy_id"



        UNION ALL



        /*
         * =============================================
         * DAMAGE
         * =============================================
         */
        SELECT

          pi."pharmacy_id"
            AS pharmacy_id,


          0::numeric
            AS gross_sales_amount,


          0::numeric
            AS discount_amount,


          0::numeric
            AS return_amount,


          0::integer
            AS sale_invoice_count,


          0::integer
            AS return_invoice_count,


          COUNT(
            di."damage_invoice_id"
          )::integer
            AS damage_invoice_count,


          0::integer
            AS supplier_invoice_count


        FROM
          "pharmacy_invoices" pi


        INNER JOIN
          "damage_invoices" di

          ON
            di."pharmacy_invoice_id"
            =
            pi."pharmacy_invoice_id"


        WHERE

          pi."invoice_type" = 'DAMAGE'

          AND pi."status" = 'POSTED'

          AND pi."invoice_date"
            = ${targetDate}::date


        GROUP BY
          pi."pharmacy_id"



        UNION ALL



        /*
         * =============================================
         * SUPPLIER INVOICES
         * =============================================
         */
        SELECT

          s."pharmacy_id"
            AS pharmacy_id,


          0::numeric
            AS gross_sales_amount,


          0::numeric
            AS discount_amount,


          0::numeric
            AS return_amount,


          0::integer
            AS sale_invoice_count,


          0::integer
            AS return_invoice_count,


          0::integer
            AS damage_invoice_count,


          COUNT(
            supi."supplier_invoice_id"
          )::integer
            AS supplier_invoice_count


        FROM
          "supplier_invoices" supi


        INNER JOIN
          "suppliers" s

          ON
            s."supplier_id"
            =
            supi."supplier_id"


        WHERE

          supi."status"
            <> 'CANCELLED'

          AND supi."invoice_date"
            = ${targetDate}::date


        GROUP BY
          s."pharmacy_id"

      )


      SELECT

        pharmacy_id
          AS "pharmacyId",


        COALESCE(
          SUM(
            gross_sales_amount
          ),
          0
        )::text
          AS "grossSalesAmount",


        COALESCE(
          SUM(
            discount_amount
          ),
          0
        )::text
          AS "discountAmount",


        COALESCE(
          SUM(
            return_amount
          ),
          0
        )::text
          AS "returnAmount",


        (
          COALESCE(
            SUM(
              gross_sales_amount
            ),
            0
          )

          -

          COALESCE(
            SUM(
              discount_amount
            ),
            0
          )

          -

          COALESCE(
            SUM(
              return_amount
            ),
            0
          )
        )::text
          AS "netSalesAmount",


        SUM(
          sale_invoice_count
        )::integer
          AS "saleInvoiceCount",


        SUM(
          return_invoice_count
        )::integer
          AS "returnInvoiceCount",


        SUM(
          damage_invoice_count
        )::integer
          AS "damageInvoiceCount",


        SUM(
          supplier_invoice_count
        )::integer
          AS "supplierInvoiceCount"


      FROM
        daily_events


      GROUP BY
        pharmacy_id


      ORDER BY
        pharmacy_id

    `;
  }

  /**
   * تحويل:
   *
   * 2026-08-20
   *
   * إلى:
   *
   * 20260820
   */
  private toDateKey(date: string): number {
    return Number(date.replaceAll('-', ''));
  }
}
