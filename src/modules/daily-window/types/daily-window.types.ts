export type InventoryAlertType = 'STOCK_ALERT' | 'EXPIRY_ALERT';

export type AlertBatch = {
  batchId: number;
  remainingQuantity: number;
  expiryDate: Date;
  daysUntilExpiry: number;
};

export type InventoryAlertItem = {
  pharmacyDrugId: number;
  drugName: string;

  alertType: InventoryAlertType;

  /**
   * For STOCK_ALERT:
   * The current sellable quantity.
   *
   * For EXPIRY_ALERT:
   * The quantity inside affected batches.
   */
  quantity: number;

  /**
   * Available only for expiry alerts.
   */
  expiryDate: Date | null;
};

export type DailyInvoiceCounts = {
  totalCount: number;

  breakdown: {
    saleCount: number;
    returnCount: number;
    damageCount: number;
    purchaseCount: number;
  };
};

export type DailyGrossProfit = {
  salesRevenue: number;
  returnAmount: number;
  netSalesRevenue: number;

  salesCostOfGoods: number;
  restoredInventoryCost: number;
  netCostOfGoodsSold: number;

  grossProfitAmount: number | null;

  missingCostBaseQuantity: number;
  isComplete: boolean;

  currency: 'SYP';
};

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};
