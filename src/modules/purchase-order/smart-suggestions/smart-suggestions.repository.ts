import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

import { IncomingOrderItem, SmartSuggestion } from './smart-suggestion.type';

@Injectable()
export class SmartSuggestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * يرجع الأدوية التي تحتاج إلى طلب من المورد.
   *
   * كل الحسابات تتم داخل PostgreSQL في Query واحدة:
   *
   * 1. حساب المخزون الحالي.
   * 2. حساب الكميات القادمة.
   * 3. حساب طلبات الزبائن غير المنفذة.
   * 4. حساب المخزون المتوقع.
   * 5. حساب الكمية الموصى بطلبها.
   *
   * وفي النهاية لا نرجع إلا الأدوية التي:
   *
   * recommendedQuantity > 0
   */
  // async getSmartSuggestions(pharmacyId: number): Promise<SmartSuggestion[]> {
  //   return this.prisma.$queryRaw<SmartSuggestion[]>`
  //     /*
  //      * ============================================================
  //      * 1. CURRENT STOCK
  //      * ============================================================
  //      *
  //      * نحسب الكمية الموجودة فعلياً داخل الـ batches.
  //      *
  //      * Current Stock =
  //      * SUM(initial_quantity - sold_quantity)
  //      *
  //      * نأخذ فقط:
  //      * - Batch فعال ACTIVE
  //      * - غير منتهي الصلاحية
  //      * - تابع للصيدلية الحالية
  //      */
  //     WITH current_stock AS (
  //       SELECT
  //         b.pharmacy_drug_id,

  //         GREATEST(
  //           COALESCE(
  //             SUM(
  //               b.initial_quantity
  //               - b.sold_quantity
  //             ),
  //             0
  //           ),
  //           0
  //         )::int AS current_stock

  //       FROM batches b

  //       INNER JOIN pharmacy_drugs pd
  //         ON pd.pharmacy_drug_id =
  //            b.pharmacy_drug_id

  //       WHERE
  //         pd.pharmacy_id = ${pharmacyId}

  //         AND b.status = 'ACTIVE'

  //         /*
  //          * لا نحسب Batch منتهي الصلاحية.
  //          *
  //          * إذا expiry_date = NULL
  //          * نعتبره صالحاً حسب تصميم النظام الحالي.
  //          */
  //         AND (
  //           b.expiry_date IS NULL
  //           OR b.expiry_date >= CURRENT_DATE
  //         )

  //       GROUP BY
  //         b.pharmacy_drug_id
  //     ),

  //     /*
  //      * ============================================================
  //      * 2. INCOMING STOCK
  //      * ============================================================
  //      *
  //      * نحسب الكميات القادمة من المورد.
  //      *
  //      * شروط الطلب القادم:
  //      *
  //      * PurchaseOrder = CONFIRMED
  //      * أي تم إرساله للمورد.
  //      *
  //      * PurchaseOrderItem = PENDING
  //      * أي لم يتم استلامه بعد.
  //      *
  //      * expected_receipt_date >= اليوم
  //      * أي لم يصبح الطلب متأخراً.
  //      *
  //      * مهم:
  //      * ordered_quantity_boxes مخزن بعدد الصناديق،
  //      * بينما المخزون يعمل بالوحدة الأساسية.
  //      *
  //      * لذلك:
  //      *
  //      * incomingQuantity =
  //      * orderedQuantityBoxes * unitsPerBox
  //      */
  //     incoming_stock AS (
  //       SELECT
  //           poi.pharmacy_drug_id,

  //           COALESCE(
  //           SUM(
  //               poi.ordered_quantity_boxes
  //               *
  //               COALESCE(
  //               gd.units_per_box,
  //               pr.units_per_box,
  //               1
  //               )
  //           ),
  //           0
  //           )::int AS incoming_quantity

  //       FROM purchase_order_items poi

  //       INNER JOIN purchase_orders po
  //           ON po.purchase_order_id =
  //           poi.purchase_order_id

  //       INNER JOIN pharmacy_drugs pd
  //           ON pd.pharmacy_drug_id =
  //           poi.pharmacy_drug_id

  //       INNER JOIN drugs d
  //           ON d.drug_id = pd.drug_id

  //       LEFT JOIN general_drugs gd
  //           ON gd.drug_id = d.drug_id

  //       LEFT JOIN private_drugs pr
  //           ON pr.drug_id = d.drug_id

  //       WHERE
  //           po.pharmacy_id = ${pharmacyId}

  //           /*
  //           * الطلب أُرسل للمورد.
  //           */
  //           AND po.order_status = 'CONFIRMED'

  //           /*
  //           * هذا الـ item لم يتم استلامه بعد.
  //           */
  //           AND poi.status = 'PENDING'
  //           /*
  //           * لا نعتبر الطلب Incoming إذا لم يكن
  //           * لديه تاريخ وصول متوقع.
  //           */
  //           AND po.expected_receipt_date IS NOT NULL

  //           /*
  //           * الطلب يدخل في المخزون القادم فقط إذا:
  //           *
  //           * موعد وصوله = اليوم
  //           * أو
  //           * موعد وصوله في المستقبل.
  //           *
  //           * إذا أصبح التاريخ أقدم من اليوم،
  //           * يصبح الطلب OVERDUE ولا نحسب كميته
  //           * ضمن projected stock.
  //           */
  //           AND po.expected_receipt_date >= CURRENT_DATE

  //       GROUP BY
  //           poi.pharmacy_drug_id
  //       ),

  //     /*
  //      * ============================================================
  //      * 3. PENDING CUSTOMER DEMAND
  //      * ============================================================
  //      *
  //      * هذه ليست كمية محجوزة فعلياً.
  //      *
  //      * هي كمية نعرف أن الزبائن طلبوها
  //      * ولم يتم تنفيذها بالكامل بعد.
  //      *
  //      * لكل CustomerRequestItem:
  //      *
  //      * remaining =
  //      * requestedQuantity - fulfilledQuantity
  //      */
  //     customer_demand AS (
  //       SELECT
  //         cri."pharmacyDrugId"
  //           AS pharmacy_drug_id,

  //         COALESCE(
  //           SUM(
  //             GREATEST(
  //               cri."requestedQuantity"
  //               -
  //               cri."fulfilledQuantity",
  //               0
  //             )
  //           ),
  //           0
  //         )::int
  //           AS pending_customer_demand

  //       FROM "CustomerRequestItem" cri

  //       INNER JOIN "CustomerRequest" cr
  //         ON cr."customerRequestId" =
  //            cri."customerRequestId"

  //       WHERE
  //         cr."pharmacyId" = ${pharmacyId}

  //         /*
  //          * فقط Customer Requests
  //          * التي لا تزال فعالة.
  //          */
  //         AND cr.status IN (
  //           'PENDING',
  //           'PARTIALLY_FULFILLED',
  //           'READY_FOR_PICKUP'
  //         )

  //         /*
  //          * لا نحسب item تم تنفيذه أو إلغاؤه.
  //          */
  //         AND cri.status NOT IN (
  //           'FULFILLED',
  //           'CANCELLED'
  //         )

  //       GROUP BY
  //         cri."pharmacyDrugId"
  //     ),

  //     /*
  //      * ============================================================
  //      * 4. BASE DATA
  //      * ============================================================
  //      *
  //      * نجمع القيم السابقة مع PharmacyDrug.
  //      *
  //      * هنا يصبح لكل دواء:
  //      *
  //      * currentStock
  //      * incomingQuantity
  //      * pendingCustomerDemand
  //      * safetyStock
  //      */
  //     base_data AS (
  //       SELECT
  //   pd.pharmacy_drug_id,

  //   COALESCE(
  //     gd.trade_name,
  //     pr."tradeName",
  //     'Unknown'
  //   ) AS drug_name,

  //   /*
  //    * عدد الوحدات داخل العلبة.
  //    */
  //   COALESCE(
  //     gd.units_per_box,
  //     pr.units_per_box,
  //     1
  //   )::int AS units_per_box,

  //   /*
  //    * المخزون الحالي بالفرط.
  //    */
  //   COALESCE(
  //     cs.current_stock,
  //     0
  //   )::int AS current_stock,

  //   /*
  //    * الكميات القادمة بالفرط.
  //    */
  //   COALESCE(
  //     ins.incoming_quantity,
  //     0
  //   )::int AS incoming_quantity,

  //   /*
  //    * طلبات الزبائن بالفرط.
  //    */
  //   COALESCE(
  //     cd.pending_customer_demand,
  //     0
  //   )::int AS pending_customer_demand,

  //   /*
  //    * minStockAlert مخزن بالعلب.
  //    *
  //    * نحوله للفرط حتى تكون جميع الحسابات
  //    * بنفس الوحدة.
  //    */
  //   (
  //     COALESCE(
  //       pd.min_stock_alert,
  //       0
  //     )
  //     *
  //     COALESCE(
  //       gd.units_per_box,
  //       pr.units_per_box,
  //       1
  //     )
  //   )::int AS safety_stock

  //       FROM pharmacy_drugs pd

  //       INNER JOIN drugs d
  //         ON d.drug_id = pd.drug_id

  //       LEFT JOIN general_drugs gd
  //         ON gd.drug_id = d.drug_id

  //       LEFT JOIN private_drugs pr
  //         ON pr.drug_id = d.drug_id

  //       LEFT JOIN current_stock cs
  //         ON cs.pharmacy_drug_id =
  //            pd.pharmacy_drug_id

  //       LEFT JOIN incoming_stock ins
  //         ON ins.pharmacy_drug_id =
  //            pd.pharmacy_drug_id

  //       LEFT JOIN customer_demand cd
  //         ON cd.pharmacy_drug_id =
  //            pd.pharmacy_drug_id

  //       WHERE
  //         pd.pharmacy_id = ${pharmacyId}

  //         /*
  //          * فقط الأدوية الفعالة.
  //          */
  //         AND pd.is_active = TRUE

  //         /*
  //          * إذا لم يكن للدواء Safety Stock،
  //          * فلا يوجد أساس لاقتراح كمية.
  //          */
  //         AND COALESCE(
  //           pd.min_stock_alert,
  //           0
  //         ) > 0
  //     ),

  //     /*
  //      * ============================================================
  //      * 5. CALCULATIONS
  //      * ============================================================
  //      *
  //      * هنا قلب الـ Smart Suggestions.
  //      */
  //     calculated AS (
  //       SELECT
  //       pharmacy_drug_id,
  //       drug_name,
  //       units_per_box,

  //       current_stock,
  //       incoming_quantity,
  //       pending_customer_demand,
  //       safety_stock,

  //         /*
  //          * -----------------------------------------
  //          * Projected Stock
  //          * -----------------------------------------
  //          *
  //          * Current
  //          * +
  //          * Incoming
  //          * -
  //          * Customer Demand
  //          */
  //         (
  //           current_stock
  //           +
  //           incoming_quantity
  //           -
  //           pending_customer_demand
  //           )::int AS projected_stock,

  //         /*
  //          * -----------------------------------------
  //          * Recommended Quantity
  //          * -----------------------------------------
  //          *
  //          * Safety Stock
  //          * -
  //          * Projected Stock
  //          *
  //          * وإذا كانت النتيجة سالبة:
  //          * نرجع صفر.
  //          */
  //         GREATEST(
  //           safety_stock
  //           -
  //           (
  //               current_stock
  //               +
  //               incoming_quantity
  //               -
  //               pending_customer_demand
  //           ),
  //           0
  //       )::int AS recommended_quantity

  //       FROM base_data
  //     )

  //     /*
  //      * ============================================================
  //      * FINAL RESULT
  //      * ============================================================
  //      */
  //     SELECT
  // pharmacy_drug_id
  //   AS "pharmacyDrugId",

  // drug_name
  //   AS "drugName",

  // units_per_box
  //   AS "unitsPerBox",

  // /*
  //  * المخزون الحالي بالفرط.
  //  */
  // current_stock
  //   AS "currentStock",

  // /*
  //  * عدد العلب الكاملة الموجودة حالياً.
  //  *
  //  * PostgreSQL integer division.
  //  */
  // FLOOR(
  //   current_stock::numeric
  //   /
  //   units_per_box
  // )::int AS "currentFullBoxes",

  // /*
  //  * الوحدات المتبقية خارج العلب الكاملة.
  //  *
  //  * مثال:
  //  * 260 % 24 = 20
  //  */
  // MOD(
  //   current_stock,
  //   units_per_box
  // )::int AS "currentLooseUnits",

  // incoming_quantity
  //   AS "incomingQuantity",

  // pending_customer_demand
  //   AS "pendingCustomerDemand",

  // projected_stock
  //   AS "projectedStock",

  // safety_stock
  //   AS "safetyStock",

  // /*
  //  * minStockAlert الأصلي تقريباً.
  //  */
  // (
  //   safety_stock
  //   /
  //   units_per_box
  // )::int AS "safetyStockBoxes",

  // /*
  //  * النقص الحقيقي بالفرط.
  //  */
  // recommended_quantity
  //   AS "recommendedQuantity",

  // /*
  //  * عدد العلب التي يجب شراؤها.
  //  *
  //  * CEIL مهم جداً:
  //  * إذا احتجنا 220 وحدة
  //  * والعلبة 24:
  //  *
  //  * CEIL(220 / 24) = 10
  //  */
  // CEIL(
  //   recommended_quantity::numeric
  //   /
  //   units_per_box
  // )::int AS "recommendedBoxes",

  // /*
  //  * عدد الوحدات التي ستدخل فعلياً
  //  * عند شراء العلب المقترحة.
  //  */
  // (
  //   CEIL(
  //     recommended_quantity::numeric
  //     /
  //     units_per_box
  //   )
  //   *
  //   units_per_box
  // )::int AS "recommendedPurchaseQuantity"

  //     FROM calculated

  //     /*
  //      * فقط الأدوية التي تحتاج إلى طلب.
  //      */
  //     WHERE recommended_quantity > 0

  //     /*
  //      * الأكثر نقصاً أولاً.
  //      */
  //     ORDER BY
  //       recommended_quantity DESC,
  //       drug_name ASC;
  //   `;
  // }

  /**
   * ============================================================
   * SMART SUGGESTIONS
   * ============================================================
   *
   * الهدف:
   * معرفة الأدوية التي تحتاج الصيدلية إلى طلبها من المورد.
   *
   * قاعدة الوحدات في النظام:
   *
   * Batch quantities:
   *   Base Units / فرط
   *
   * Customer Request quantities:
   *   BOX
   *
   * Purchase Order quantities:
   *   BOX
   *
   * minStockAlert:
   *   BOX
   *
   * لذلك نقوم أولاً بتحويل جميع القيم إلى Base Units،
   * وبعدها فقط نقوم بالحساب.
   *
   * المعادلة:
   *
   * Projected Stock =
   * Current Stock
   * +
   * Incoming Stock
   * -
   * Pending Customer Demand
   *
   *
   * Recommended Quantity =
   * MAX(
   *   Safety Stock - Projected Stock,
   *   0
   * )
   *
   *
   * وفي النهاية:
   *
   * Recommended Boxes =
   * CEIL(
   *   Recommended Quantity / Units Per Box
   * )
   */
  async getSmartSuggestions(pharmacyId: number): Promise<SmartSuggestion[]> {
    return this.prisma.$queryRaw<SmartSuggestion[]>`

      /*
       * ============================================================
       * 1. CURRENT STOCK
       * ============================================================
       *
       * الـ Batch مخزن أصلاً بالـ Base Units / فرط.
       *
       * Current Stock =
       *
       * SUM(
       *   initial_quantity - sold_quantity
       * )
       *
       * نحسب فقط:
       *
       * - Batch ACTIVE.
       * - غير منتهي الصلاحية.
       * - تابع للصيدلية الحالية.
       */
      WITH current_stock AS (
        SELECT
          b.pharmacy_drug_id,

          GREATEST(
            COALESCE(
              SUM(
                b.initial_quantity
                -
                b.sold_quantity
              ),
              0
            ),
            0
          )::int AS current_stock

        FROM batches b

        INNER JOIN pharmacy_drugs pd
          ON pd.pharmacy_drug_id =
             b.pharmacy_drug_id

        WHERE
          pd.pharmacy_id = ${pharmacyId}

          /*
           * فقط الدفعات الفعالة.
           */
          AND b.status = 'ACTIVE'

          /*
           * لا نحسب الدفعات منتهية الصلاحية.
           */
          AND (
            b.expiry_date IS NULL
            OR b.expiry_date >= CURRENT_DATE
          )

        GROUP BY
          b.pharmacy_drug_id
      ),


      /*
       * ============================================================
       * 2. INCOMING STOCK
       * ============================================================
       *
       * PurchaseOrderItem.orderedQuantityBoxes
       * مخزن بعدد العلب.
       *
       * لذلك نحوله إلى Base Units:
       *
       * orderedQuantityBoxes
       * *
       * unitsPerBox
       *
       *
       * شروط الطلب الذي نعتبره Incoming:
       *
       * 1. PurchaseOrder = CONFIRMED
       *    أي تم إرساله للمورد.
       *
       * 2. PurchaseOrderItem = PENDING
       *    أي العنصر لم يتم استلامه بعد.
       *
       * 3. يوجد expectedReceiptDate.
       *
       * 4. تاريخ الوصول اليوم أو في المستقبل.
       *
       * الطلب OVERDUE لا نحسبه ضمن المخزون القادم.
       */
      incoming_stock AS (
        SELECT
          poi.pharmacy_drug_id,

          COALESCE(
            SUM(
              poi.ordered_quantity_boxes
              *
              COALESCE(
                gd.units_per_box,
                pr.units_per_box,
                1
              )
            ),
            0
          )::int AS incoming_quantity

        FROM purchase_order_items poi

        INNER JOIN purchase_orders po
          ON po.purchase_order_id =
             poi.purchase_order_id

        INNER JOIN pharmacy_drugs pd
          ON pd.pharmacy_drug_id =
             poi.pharmacy_drug_id

        INNER JOIN drugs d
          ON d.drug_id =
             pd.drug_id

        LEFT JOIN general_drugs gd
          ON gd.drug_id =
             d.drug_id

        LEFT JOIN private_drugs pr
          ON pr.drug_id =
             d.drug_id

        WHERE
          po.pharmacy_id = ${pharmacyId}

          /*
           * الطلب تم إرساله للمورد.
           */
          AND po.order_status = 'CONFIRMED'

          /*
           * العنصر لم يتم استلامه بعد.
           */
          AND poi.status = 'PENDING'

          /*
           * يجب أن يوجد موعد وصول متوقع.
           */
          AND po.expected_receipt_date
              IS NOT NULL

          /*
           * الطلب الذي موعده فات لا نعتبر
           * كميته Incoming.
           *
           * TODAY يدخل بالحساب.
           * UPCOMING يدخل بالحساب.
           * OVERDUE لا يدخل.
           */
          AND po.expected_receipt_date
              >= CURRENT_DATE

        GROUP BY
          poi.pharmacy_drug_id
      ),


      /*
       * ============================================================
       * 3. CUSTOMER DEMAND - BOXES
       * ============================================================
       *
       * مهم جداً:
       *
       * CustomerRequestItem.requestedQuantity
       * و fulfilledQuantity
       *
       * مخزنان بعدد العلب وليس بالفرط.
       *
       * لذلك هذه المرحلة تحسب فقط:
       *
       * كم BOX متبقي للزبائن؟
       *
       * remainingBoxes =
       *
       * requestedQuantity
       * -
       * fulfilledQuantity
       *
       *
       * لا نحول إلى Base Units هنا بعد.
       * التحويل سيتم في base_data عندما يكون
       * unitsPerBox متاحاً.
       */
      customer_demand AS (
        SELECT
          cri."pharmacyDrugId"
            AS pharmacy_drug_id,

          COALESCE(
            SUM(
              GREATEST(
                cri."requestedQuantity"
                -
                cri."fulfilledQuantity",
                0
              )
            ),
            0
          )::int
            AS pending_customer_demand_boxes

        FROM "CustomerRequestItem" cri

        INNER JOIN "CustomerRequest" cr
          ON cr."customerRequestId" =
             cri."customerRequestId"

        WHERE
          /*
           * طلبات نفس الصيدلية فقط.
           */
          cr."pharmacyId" = ${pharmacyId}

          /*
           * فقط الطلبات التي لا تزال فعالة.
           */
          AND cr.status IN (
            'PENDING',
            'PARTIALLY_FULFILLED',
            'READY_FOR_PICKUP'
          )

          /*
           * لا نحسب Item تم تنفيذه بالكامل
           * أو إلغاؤه.
           */
          AND cri.status NOT IN (
            'FULFILLED',
            'CANCELLED'
          )

        /*
         * كل دواء له Demand مستقل.
         *
         * إذا كان لدينا:
         *
         * Drug A = 350 BOX
         * Drug B = 80 BOX
         *
         * لن يتم جمع 350 + 80.
         *
         * التجميع يتم حسب pharmacyDrugId.
         */
        GROUP BY
          cri."pharmacyDrugId"
      ),


      /*
       * ============================================================
       * 4. BASE DATA
       * ============================================================
       *
       * هنا نوحد كل الوحدات.
       *
       * بعد هذه المرحلة تصبح:
       *
       * current_stock
       * incoming_quantity
       * pending_customer_demand
       * safety_stock
       *
       * كلها Base Units / فرط.
       */
      base_data AS (
        SELECT
          pd.pharmacy_drug_id,

          /*
           * اسم الدواء.
           *
           * الدواء يمكن أن يكون:
           *
           * GENERAL
           * أو
           * PRIVATE
           */
          COALESCE(
            gd.trade_name,
            pr."tradeName",
            'Unknown'
          ) AS drug_name,


          /*
           * عدد الوحدات الموجودة داخل العلبة.
           *
           * مثال:
           *
           * 1 BOX = 24 UNIT
           */
          COALESCE(
            gd.units_per_box,
            pr.units_per_box,
            1
          )::int AS units_per_box,


          /*
           * -----------------------------------------
           * CURRENT STOCK
           * -----------------------------------------
           *
           * أصلاً Base Units.
           */
          COALESCE(
            cs.current_stock,
            0
          )::int AS current_stock,


          /*
           * -----------------------------------------
           * INCOMING STOCK
           * -----------------------------------------
           *
           * تم تحويله في incoming_stock من BOX
           * إلى Base Units.
           */
          COALESCE(
            ins.incoming_quantity,
            0
          )::int AS incoming_quantity,


          /*
           * -----------------------------------------
           * CUSTOMER DEMAND
           * -----------------------------------------
           *
           * Customer Request مخزن بالعلب.
           *
           * لذلك:
           *
           * remainingBoxes * unitsPerBox
           *
           * حتى نحصل على Base Units.
           *
           * مثال:
           *
           * customerDemand = 80 BOX
           * unitsPerBox = 24
           *
           * pendingCustomerDemand =
           *
           * 80 * 24
           * = 1920 Base Units
           */
          (
            COALESCE(
              cd.pending_customer_demand_boxes,
              0
            )
            *
            COALESCE(
              gd.units_per_box,
              pr.units_per_box,
              1
            )
          )::int
            AS pending_customer_demand,


          /*
           * -----------------------------------------
           * SAFETY STOCK
           * -----------------------------------------
           *
           * minStockAlert مخزن بعدد العلب.
           *
           * لذلك نحوله إلى Base Units.
           *
           * مثال:
           *
           * minStockAlert = 20 BOX
           * unitsPerBox = 24
           *
           * safetyStock =
           *
           * 20 * 24
           * = 480 Base Units
           */
          (
            COALESCE(
              pd.min_stock_alert,
              0
            )
            *
            COALESCE(
              gd.units_per_box,
              pr.units_per_box,
              1
            )
          )::int
            AS safety_stock

        FROM pharmacy_drugs pd

        INNER JOIN drugs d
          ON d.drug_id =
             pd.drug_id

        LEFT JOIN general_drugs gd
          ON gd.drug_id =
             d.drug_id

        LEFT JOIN private_drugs pr
          ON pr.drug_id =
             d.drug_id

        LEFT JOIN current_stock cs
          ON cs.pharmacy_drug_id =
             pd.pharmacy_drug_id

        LEFT JOIN incoming_stock ins
          ON ins.pharmacy_drug_id =
             pd.pharmacy_drug_id

        LEFT JOIN customer_demand cd
          ON cd.pharmacy_drug_id =
             pd.pharmacy_drug_id

        WHERE
          /*
           * أدوية الصيدلية الحالية فقط.
           */
          pd.pharmacy_id = ${pharmacyId}

          /*
           * الدواء يجب أن يكون فعالاً.
           */
          AND pd.is_active = TRUE

          /*
           * إذا لم يوجد Min Stock Alert
           * فلا يوجد أساس لاقتراح شراء.
           */
          AND COALESCE(
            pd.min_stock_alert,
            0
          ) > 0
      ),


      /*
       * ============================================================
       * 5. CALCULATIONS
       * ============================================================
       *
       * الآن جميع القيم بنفس الوحدة:
       *
       * Base Units.
       */
      calculated AS (
        SELECT
          pharmacy_drug_id,

          drug_name,

          units_per_box,

          current_stock,

          incoming_quantity,

          pending_customer_demand,

          safety_stock,


          /*
           * -----------------------------------------
           * PROJECTED STOCK
           * -----------------------------------------
           *
           * المخزون المتوقع:
           *
           * Current
           * +
           * Incoming
           * -
           * Customer Demand
           */
          (
            current_stock
            +
            incoming_quantity
            -
            pending_customer_demand
          )::int
            AS projected_stock,


          /*
           * -----------------------------------------
           * RECOMMENDED QUANTITY
           * -----------------------------------------
           *
           * النقص الحقيقي بالـ Base Units.
           *
           * Safety Stock
           * -
           * Projected Stock
           *
           * إذا كانت النتيجة سالبة:
           * نرجع صفر.
           */
          GREATEST(
            safety_stock
            -
            (
              current_stock
              +
              incoming_quantity
              -
              pending_customer_demand
            ),
            0
          )::int
            AS recommended_quantity

        FROM base_data
      )


      /*
       * ============================================================
       * 6. FINAL RESULT
       * ============================================================
       */
      SELECT
        pharmacy_drug_id
          AS "pharmacyDrugId",

        drug_name
          AS "drugName",

        units_per_box
          AS "unitsPerBox",


        /*
         * المخزون الحالي بالـ Base Units.
         */
        current_stock
          AS "currentStock",


        /*
         * عدد العلب الكاملة الموجودة حالياً.
         *
         * مثال:
         *
         * 260 / 24 = 10 علب كاملة
         */
        FLOOR(
          current_stock::numeric
          /
          units_per_box
        )::int
          AS "currentFullBoxes",


        /*
         * الفرط المتبقي.
         *
         * مثال:
         *
         * 260 % 24 = 20
         */
        MOD(
          current_stock,
          units_per_box
        )::int
          AS "currentLooseUnits",


        /*
         * طلبات المورد القادمة بالـ Base Units.
         */
        incoming_quantity
          AS "incomingQuantity",


        /*
         * طلبات الزبائن غير المنفذة
         * بعد تحويلها إلى Base Units.
         */
        pending_customer_demand
          AS "pendingCustomerDemand",


        /*
         * المخزون المتوقع بالـ Base Units.
         */
        projected_stock
          AS "projectedStock",
          /*
          * عدد العلب الكاملة في المخزون المتوقع.
          *
          * مثال:
          * projectedStock = 260
          * unitsPerBox = 24
          *
          * = 10 علب كاملة
          */
          FLOOR(
            projected_stock::numeric
            /
            units_per_box
          )::int
            AS "projectedFullBoxes",

          /*
          * الفرط المتبقي من المخزون المتوقع.
          *
          * مثال:
          * 260 % 24 = 20
          */
          MOD(
          projected_stock,
          units_per_box
        )::int
          AS "projectedLooseUnits",

        /*
         * الحد الآمن بالـ Base Units.
         */
        safety_stock
          AS "safetyStock",


        /*
         * الحد الآمن بعدد العلب.
         *
         * وهو عملياً minStockAlert الأصلي.
         */
        (
          safety_stock
          /
          units_per_box
        )::int
          AS "safetyStockBoxes",


        /*
         * النقص الحقيقي بالفرط.
         */
        recommended_quantity
          AS "recommendedQuantity",


        /*
         * عدد العلب المقترح طلبها.
         *
         * نستخدم CEIL وليس FLOOR.
         *
         * مثال:
         *
         * نقص = 220
         * unitsPerBox = 24
         *
         * 220 / 24 = 9.16
         *
         * CEIL = 10 BOX
         */
        CEIL(
          recommended_quantity::numeric
          /
          units_per_box
        )::int
          AS "recommendedBoxes",


        /*
         * الكمية التي ستدخل فعلياً للمخزون
         * عند طلب عدد العلب المقترح.
         *
         * مثال:
         *
         * 10 BOX * 24 = 240 Base Units.
         */
        (
          CEIL(
            recommended_quantity::numeric
            /
            units_per_box
          )
          *
          units_per_box
        )::int
          AS "recommendedPurchaseQuantity"

      FROM calculated

      /*
       * لا نعرض إلا الأدوية التي تحتاج فعلاً
       * إلى شراء.
       */
      WHERE
        recommended_quantity > 0

      /*
       * الأكثر نقصاً أولاً.
       */
      ORDER BY
        recommended_quantity DESC,
        drug_name ASC;
    `;
  }

  /**
   * يرجع عناصر طلبات المورد التي تم إرسالها
   * ولم يتم استلامها بعد.
   *
   * هذا التابع مسؤول عن واجهة:
   *
   * "تتبع الطلبات القادمة"
   *
   * مهم جداً:
   *
   * الطلب المتأخر يظهر هنا ولا نحذفه.
   *
   * الفرق عن Smart Suggestions:
   *
   * Smart Suggestions:
   * الطلب المتأخر لا يدخل في incomingQuantity.
   *
   * Incoming Orders:
   * الطلب المتأخر يبقى ظاهراً لكن بحالة OVERDUE.
   */
  async getIncomingOrders(pharmacyId: number): Promise<IncomingOrderItem[]> {
    return this.prisma.$queryRaw<IncomingOrderItem[]>`
    SELECT
      /*
       * رقم طلب المورد.
       */
      po.purchase_order_id
        AS "purchaseOrderId",

      /*
       * رقم العنصر نفسه.
       */
      poi.purchase_order_item_id
        AS "purchaseOrderItemId",

      poi.pharmacy_drug_id
        AS "pharmacyDrugId",

      /*
       * الدواء إما GENERAL أو PRIVATE.
       *
       * لذلك نستخدم COALESCE للحصول
       * على الاسم الموجود فعلياً.
       */
      COALESCE(
        gd.trade_name,
        pr."tradeName",
        'Unknown'
      ) AS "drugName",

      /*
       * ملاحظة مهمة:
       *
       * supplierId في Prisma schema لا يحتوي @map،
       * لذلك اسم العمود الحقيقي هو "supplierId".
       */
      s.supplier_id
        AS "supplierId",

      s.supplier_name
        AS "supplierName",

      /*
       * عدد العلب المطلوبة من المورد.
       */
      poi.ordered_quantity_boxes
        AS "orderedQuantityBoxes",

      /*
       * عدد الوحدات داخل كل علبة.
       */
    --   COALESCE(
    --     gd.units_per_box,
    --     pr.units_per_box,
    --     1
    --   )::int AS "unitsPerBox",

      /*
       * الكمية نفسها لكن بالفرط.
       *
       * مثال:
       *
       * 10 علب × 24 وحدة
       * = 240 وحدة.
       */
    --   (
    --     poi.ordered_quantity_boxes
    --     *
    --     COALESCE(
    --       gd.units_per_box,
    --       pr.units_per_box,
    --       1
    --     )
    --   )::int AS "quantityBaseUnits",

      po.order_date
        AS "orderDate",

      po.expected_receipt_date
        AS "expectedReceiptDate",

      /*
       * نحسب الحالة Runtime.
       *
       * لا نحتاج تخزين:
       *
       * UPCOMING
       * TODAY
       * OVERDUE
       *
       * داخل قاعدة البيانات.
       */
      CASE

        /*
         * هذا مفيد فقط للطلبات القديمة
         * التي ربما تم إنشاؤها قبل إضافة
         * expectedReceiptDate.
         */
        WHEN po.expected_receipt_date IS NULL
          THEN 'UNKNOWN'

        /*
         * التاريخ مر ولم يتم استلام العنصر.
         */
        WHEN po.expected_receipt_date < CURRENT_DATE
          THEN 'OVERDUE'

        /*
         * موعد الوصول اليوم.
         */
        WHEN po.expected_receipt_date = CURRENT_DATE
          THEN 'TODAY'

        /*
         * موعد الوصول في المستقبل.
         */
        ELSE 'UPCOMING'

      END AS "deliveryStatus",

      /*
       * Date - Date في PostgreSQL
       * يعطينا الفرق بعدد الأيام.
       *
       * مثال:
       *
       * tomorrow = 1
       * today    = 0
       * yesterday = -1
       */
      CASE
        WHEN po.expected_receipt_date IS NULL
          THEN NULL

        ELSE (
          po.expected_receipt_date
          -
          CURRENT_DATE
        )::int

      END AS "daysUntilReceipt"

    FROM purchase_order_items poi

    /*
     * نصل إلى PurchaseOrder لمعرفة:
     *
     * pharmacy
     * status
     * expectedReceiptDate
     * supplier
     */
    INNER JOIN purchase_orders po
      ON po.purchase_order_id =
         poi.purchase_order_id

    /*
     * نحتاج PharmacyDrug للوصول إلى Drug.
     */
    INNER JOIN pharmacy_drugs pd
      ON pd.pharmacy_drug_id =
         poi.pharmacy_drug_id

    INNER JOIN drugs d
      ON d.drug_id =
         pd.drug_id

    /*
     * الدواء يمكن أن يكون GENERAL.
     */
    LEFT JOIN general_drugs gd
      ON gd.drug_id =
         d.drug_id

    /*
     * أو PRIVATE.
     */
    LEFT JOIN private_drugs pr
      ON pr.drug_id =
         d.drug_id

    /*
     * PurchaseOrder.supplierId لا يحتوي @map
     * في الـ Prisma schema الحالي.
     *
     * لذلك اسم العمود داخل PostgreSQL هو:
     *
     * "supplierId"
     */
    INNER JOIN suppliers s
      ON s.supplier_id =
         po."supplierId"

    WHERE
      /*
       * الطلبات الخاصة بهذه الصيدلية فقط.
       */
      po.pharmacy_id = ${pharmacyId}

      /*
       * فقط الطلب الذي تم إرساله للمورد.
       *
       * PENDING = Draft
       * وبالتالي لا يظهر هنا.
       */
      AND po.order_status = 'CONFIRMED'

      /*
       * العنصر لم يتم استلامه أو إلغاؤه.
       */
      AND poi.status = 'PENDING'

    /*
     * ترتيب الواجهة:
     *
     * 1. المتأخر أولاً.
     * 2. موعده اليوم.
     * 3. القادم.
     * 4. بدون موعد في النهاية.
     */
    ORDER BY

      CASE

        WHEN po.expected_receipt_date < CURRENT_DATE
          THEN 0

        WHEN po.expected_receipt_date = CURRENT_DATE
          THEN 1

        WHEN po.expected_receipt_date > CURRENT_DATE
          THEN 2

        ELSE 3

      END ASC,

      /*
       * داخل كل مجموعة:
       * الأقرب تاريخاً أولاً.
       */
      po.expected_receipt_date ASC NULLS LAST,

      po.purchase_order_id DESC;
  `;
  }
}
