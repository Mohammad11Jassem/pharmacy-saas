/**
 * النتيجة النهائية التي سترجع للـ Frontend
 * لكل دواء يحتاج إلى طلب من المورد.
 *
 * جميع الكميات هنا يجب أن تكون بنفس وحدة المخزون
 * حتى تكون المعادلة صحيحة.
 */
export type SmartSuggestion = {
  pharmacyDrugId: number;

  /**
   * الاسم التجاري للدواء.
   */
  drugName: string;

  /**
   * عدد الوحدات الموجودة فعلياً حالياً بالمخزون.
   */
  currentStock: number;

  /**
   * الكمية المتوقع وصولها من Purchase Orders المرسلة
   * والتي لم يتجاوز تاريخ استلامها المتوقع.
   */
  incomingQuantity: number;

  /**
   * الطلب المستقبلي المعروف من Customer Requests.
   *
   * هذه ليست Reservation حقيقية.
   * هي فقط كمية نعلم أن العملاء سيحتاجونها لاحقاً.
   */
  pendingCustomerDemand: number;

  /**
   * المخزون المتوقع:
   *
   * currentStock
   * + incomingQuantity
   * - pendingCustomerDemand
   */
  projectedStock: number;
  /**
   * عدد العلب الكاملة ضمن المخزون المتوقع.
   */
  projectedFullBoxes: number;

  /**
   * عدد الوحدات المتبقية بعد العلب الكاملة.
   */
  projectedLooseUnits: number;

  /**
   * الحد الآمن للمخزون.
   *
   * سنستخدم حالياً PharmacyDrug.minStockAlert
   * على أنه Safety Stock.
   */
  safetyStock: number;

  /**
   * الكمية التي يقترح النظام طلبها:
   *
   * max(
   *   safetyStock - projectedStock,
   *   0
   * )
   */
  recommendedQuantity: number;
};

/**
 * حالة موعد وصول طلب المورد.
 *
 * UPCOMING:
 * موعد الوصول في المستقبل.
 *
 * TODAY:
 * موعد الوصول اليوم.
 *
 * OVERDUE:
 * تجاوز موعد الوصول ولم يتم استلامه.
 *
 * UNKNOWN:
 * طلب قديم مثلاً لا يحتوي expectedReceiptDate.
 */
export type IncomingOrderDeliveryStatus =
  | 'UPCOMING'
  | 'TODAY'
  | 'OVERDUE'
  | 'UNKNOWN';

/**
 * يمثل سطراً واحداً في واجهة:
 *
 * "تتبع الطلبات القادمة"
 *
 * كل PurchaseOrderItem يرجع كسطر مستقل،
 * لأن الواجهة تعرض الصنف والكمية والمورد.
 */
export type IncomingOrderItem = {
  purchaseOrderId: number;

  purchaseOrderItemId: number;

  pharmacyDrugId: number;

  drugName: string;

  supplierId: number;

  supplierName: string;

  /**
   * الكمية كما تم طلبها من المورد.
   *
   * PurchaseOrder عندنا يعمل بالعلب.
   */
  orderedQuantityBoxes: number;

  /**
   * عدد الوحدات الموجودة داخل العلبة.
   */
  unitsPerBox: number;

  /**
   * الكمية بالفرط.
   *
   * orderedQuantityBoxes * unitsPerBox
   */
  quantityBaseUnits: number;

  orderDate: Date;

  expectedReceiptDate: Date | null;

  /**
   * UPCOMING / TODAY / OVERDUE / UNKNOWN
   */
  deliveryStatus: IncomingOrderDeliveryStatus;

  /**
   * الفرق بالأيام عن اليوم.
   *
   * مثال:
   *
   *  1  → غداً
   *  0  → اليوم
   * -1  → أمس
   * -3  → متأخر 3 أيام
   */
  daysUntilReceipt: number | null;
};
