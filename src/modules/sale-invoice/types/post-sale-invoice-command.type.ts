import {
  PaymentStatus,
  SaleType,
  UnitType,
} from '../../../generated/prisma/client';

export type PostSaleInvoicePatientCommand = {
  fullName: string;
  phone?: string;
  nationalId?: string;
};

export type PostSaleInvoiceBatchAllocationCommand = {
  batchId: number;
  displayQuantity: number;
};

export type PostSaleInvoiceItemCommand = {
  pharmacyDrugId: number;
  unitType: UnitType;
  displayQuantity: number;
  extraPercentage?: number;
  manualUnitPrice?: number;
  batchAllocations?: PostSaleInvoiceBatchAllocationCommand[];

  /**
   * Set only when this sale item fulfills a customer-request item.
   */
  customerRequestItemId?: number;
};

export type PostSaleInvoiceCommand = {
  idempotencyKey?: string;
  patientId?: number;
  patient?: PostSaleInvoicePatientCommand;
  invoiceDate?: string | Date;
  paymentStatus?: PaymentStatus;
  saleType: SaleType;
  discount?: number;
  notes?: string;

  /**
   * Set only when the invoice is generated from a customer request.
   */
  customerRequestId?: number;

  items: PostSaleInvoiceItemCommand[];
};
