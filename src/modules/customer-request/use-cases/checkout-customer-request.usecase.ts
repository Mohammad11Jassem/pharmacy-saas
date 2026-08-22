import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { resolveLargestSaleUnit } from '../../../common/sale-units/largest-sale-unit.util';
import {
  CustomerRequestItemStatus,
  CustomerRequestStatus,
  DrugSource,
  PaymentStatus,
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
  Prisma,
  SaleType,
} from '../../../generated/prisma/client';
import { SaleInvoicePostingService } from '../../sale-invoice/services/sale-invoice-posting.service';
import { CheckoutCustomerRequestDto } from '../dto/checkout-customer-request.dto';
import { calculateSalePaymentSummary } from '../../sale-invoice/utils/sale-payment-summary.util';

// const checkoutSaleInvoiceInclude = {
//   pharmacyInvoice: true,
//   items: true,
// } satisfies Prisma.SaleInvoiceInclude;

const checkoutSaleInvoiceInclude = {
  pharmacyInvoice: true,

  items: true,

  returns: {
    where: {
      pharmacyInvoice: {
        status: PharmacyInvoiceStatus.POSTED,
      },
    },
    select: {
      subtotalRefund: true,
    },
  },
} satisfies Prisma.SaleInvoiceInclude;

type CheckoutSaleInvoice = Prisma.SaleInvoiceGetPayload<{
  include: typeof checkoutSaleInvoiceInclude;
}>;

const checkoutRequestSelect = {
  customerRequestId: true,
  pharmacyId: true,
  customerName: true,
  customerPhone: true,
  status: true,
  completedAt: true,
  cancelledAt: true,
  items: {
    orderBy: {
      customerRequestItemId: 'asc',
    },
    select: {
      customerRequestItemId: true,
      pharmacyDrugId: true,
      requestedQuantity: true,
      fulfilledQuantity: true,
      status: true,
      pharmacyDrug: {
        select: {
          isActive: true,
          sellPart: true,
          drug: {
            select: {
              source: true,
              generalDrug: {
                select: {
                  tradeName: true,
                  unitsPerBox: true,
                  isActive: true,
                },
              },
              privateDrug: {
                select: {
                  tradeName: true,
                  unitsPerBox: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CustomerRequestSelect;

type CheckoutRequest = Prisma.CustomerRequestGetPayload<{
  select: typeof checkoutRequestSelect;
}>;

type ExecutionSummary = {
  soldQuantity: number;
  appliedToRequestQuantity: number;
  extraSaleQuantity: number;
  fulfilledQuantity: number;
  remainingQuantity: number;
};

@Injectable()
export class CheckoutCustomerRequestUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly saleInvoicePostingService: SaleInvoicePostingService,
  ) {}

  execute(
    pharmacyId: number,
    customerRequestId: number,
    dto: CheckoutCustomerRequestDto,
  ) {
    return this.unitOfWork.executeSerializable(async (tx) => {
      this.assertUniqueRequestItems(dto);

      const request = await this.loadRequest(tx, pharmacyId, customerRequestId);

      /**
       * Check idempotency before rejecting COMPLETED requests. A successful
       * checkout may have completed the request, and retrying the same HTTP
       * request must return the original invoice instead of failing.
       */
      const existingInvoice = await this.findInvoiceByIdempotencyKey(
        tx,
        pharmacyId,
        dto.idempotencyKey,
      );

      if (existingInvoice) {
        this.assertExistingInvoiceBelongsToRequest(
          existingInvoice,
          customerRequestId,
        );

        const executionByRequestItemId =
          await this.reconstructExecutionForInvoice(
            tx,
            request,
            existingInvoice,
          );

        return this.buildResponse(
          request,
          existingInvoice,
          executionByRequestItemId,
          true,
        );
      }

      this.assertRequestCanBeCheckedOut(request.status);

      const requestItemById = new Map(
        request.items.map((item) => [item.customerRequestItemId, item]),
      );

      const selectedItems = dto.items.map((dtoItem) => {
        const requestItem = requestItemById.get(dtoItem.customerRequestItemId);

        if (!requestItem) {
          throw new BadRequestException(
            `customerRequestItemId ${dtoItem.customerRequestItemId} does not belong to customerRequestId ${customerRequestId}`,
          );
        }

        if (requestItem.status === CustomerRequestItemStatus.CANCELLED) {
          throw new ConflictException(
            `customerRequestItemId ${requestItem.customerRequestItemId} is cancelled`,
          );
        }

        const drugData = this.resolveDrugData(requestItem);

        if (!requestItem.pharmacyDrug.isActive) {
          throw new ConflictException(
            `pharmacyDrugId ${requestItem.pharmacyDrugId} is inactive`,
          );
        }

        if (!drugData.isDrugActive) {
          throw new ConflictException(
            `Drug is inactive for pharmacyDrugId ${requestItem.pharmacyDrugId}`,
          );
        }

        const largestSaleUnit = resolveLargestSaleUnit(
          drugData.unitsPerBox,
          requestItem.pharmacyDrug.sellPart,
        );

        return {
          requestItem,
          tradeName: drugData.tradeName,
          largestSaleUnit,
          saleQuantity: dtoItem.saleQuantity,
        };
      });
      const paymentStatus = dto.paymentStatus ?? PaymentStatus.PENDING;

      const postedInvoice = await this.saleInvoicePostingService.post(
        tx,
        pharmacyId,
        {
          idempotencyKey: dto.idempotencyKey,
          paymentStatus,
          paidAmount: dto.paidAmount,
          // patient:
          //   paymentStatus !== PaymentStatus.PAID
          //     ? {
          //         fullName: request.customerName,
          //         phone: request.customerPhone ?? undefined,
          //       }
          //     : undefined,
          patient: {
            fullName: request.customerName,
            phone: request.customerPhone ?? undefined,
          },
          saleType: SaleType.CUSTOMER_REQUEST,
          customerRequestId,
          discount: dto.discount,
          notes: dto.notes,
          items: selectedItems.map((item) => ({
            customerRequestItemId: item.requestItem.customerRequestItemId,
            pharmacyDrugId: item.requestItem.pharmacyDrugId,
            unitType: item.largestSaleUnit.unitType,
            displayQuantity: item.saleQuantity,
          })),
        },
      );

      const saleInvoice = postedInvoice as CheckoutSaleInvoice;
      const executionByRequestItemId = new Map<number, ExecutionSummary>();

      for (const selectedItem of selectedItems) {
        const requestItem = selectedItem.requestItem;

        const remainingBeforeCheckout = Math.max(
          requestItem.requestedQuantity - requestItem.fulfilledQuantity,
          0,
        );

        const appliedToRequestQuantity = Math.min(
          selectedItem.saleQuantity,
          remainingBeforeCheckout,
        );

        const extraSaleQuantity = Math.max(
          selectedItem.saleQuantity - remainingBeforeCheckout,
          0,
        );

        const fulfilledQuantity = Math.min(
          requestItem.fulfilledQuantity + appliedToRequestQuantity,
          requestItem.requestedQuantity,
        );

        const remainingQuantity = Math.max(
          requestItem.requestedQuantity - fulfilledQuantity,
          0,
        );

        const itemStatus =
          fulfilledQuantity >= requestItem.requestedQuantity
            ? CustomerRequestItemStatus.FULFILLED
            : CustomerRequestItemStatus.PENDING;

        await tx.customerRequestItem.update({
          where: {
            customerRequestItemId: requestItem.customerRequestItemId,
          },
          data: {
            fulfilledQuantity,
            status: itemStatus,
          },
        });

        requestItem.fulfilledQuantity = fulfilledQuantity;
        requestItem.status = itemStatus;

        executionByRequestItemId.set(requestItem.customerRequestItemId, {
          soldQuantity: selectedItem.saleQuantity,
          appliedToRequestQuantity,
          extraSaleQuantity,
          fulfilledQuantity,
          remainingQuantity,
        });
      }

      const allItemsFulfilled = request.items.every(
        (item) => item.fulfilledQuantity >= item.requestedQuantity,
      );

      const anyItemFulfilled = request.items.some(
        (item) => item.fulfilledQuantity > 0,
      );

      const newRequestStatus = allItemsFulfilled
        ? CustomerRequestStatus.COMPLETED
        : anyItemFulfilled
          ? CustomerRequestStatus.PARTIALLY_FULFILLED
          : CustomerRequestStatus.PENDING;

      const completedAt = allItemsFulfilled ? new Date() : null;

      await tx.customerRequest.update({
        where: {
          customerRequestId,
        },
        data: {
          status: newRequestStatus,
          completedAt,
          cancelledAt: null,
        },
      });

      request.status = newRequestStatus;
      request.completedAt = completedAt;
      request.cancelledAt = null;

      return this.buildResponse(
        request,
        saleInvoice,
        executionByRequestItemId,
        false,
      );
    });
  }

  private async loadRequest(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    customerRequestId: number,
  ): Promise<CheckoutRequest> {
    const request = await tx.customerRequest.findFirst({
      where: {
        customerRequestId,
        pharmacyId,
      },
      select: checkoutRequestSelect,
    });

    if (!request) {
      throw new NotFoundException('Customer request not found');
    }

    if (request.items.length === 0) {
      throw new BadRequestException('Customer request has no items');
    }

    return request;
  }

  private assertUniqueRequestItems(dto: CheckoutCustomerRequestDto): void {
    const ids = dto.items.map((item) => item.customerRequestItemId);
    const uniqueIds = new Set(ids);

    if (ids.length !== uniqueIds.size) {
      throw new BadRequestException(
        'Duplicate customerRequestItemId values are not allowed',
      );
    }
  }

  private assertRequestCanBeCheckedOut(status: CustomerRequestStatus): void {
    if (status === CustomerRequestStatus.CANCELLED) {
      throw new ConflictException(
        'Cancelled customer request cannot be checked out',
      );
    }

    if (status === CustomerRequestStatus.COMPLETED) {
      throw new ConflictException('Customer request is already completed');
    }
  }

  private async findInvoiceByIdempotencyKey(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    idempotencyKey: string,
  ): Promise<CheckoutSaleInvoice | null> {
    return tx.saleInvoice.findFirst({
      where: {
        pharmacyInvoice: {
          pharmacyId,
          invoiceType: PharmacyInvoiceType.SALE,
          idempotencyKey,
        },
      },
      include: checkoutSaleInvoiceInclude,
    });
  }

  private assertExistingInvoiceBelongsToRequest(
    invoice: CheckoutSaleInvoice,
    customerRequestId: number,
  ): void {
    if (
      invoice.saleType !== SaleType.CUSTOMER_REQUEST ||
      invoice.customerRequestId !== customerRequestId
    ) {
      throw new ConflictException(
        'idempotencyKey is already used by another sale operation',
      );
    }
  }

  private resolveDrugData(requestItem: CheckoutRequest['items'][number]): {
    tradeName: string;
    unitsPerBox: number;
    isDrugActive: boolean;
  } {
    const drug = requestItem.pharmacyDrug.drug;

    if (drug.source === DrugSource.GENERAL) {
      if (!drug.generalDrug) {
        throw new BadRequestException('General drug data is missing');
      }

      return {
        tradeName: drug.generalDrug.tradeName,
        unitsPerBox: this.assertValidUnitsPerBox(drug.generalDrug.unitsPerBox),
        isDrugActive: drug.generalDrug.isActive,
      };
    }

    if (!drug.privateDrug) {
      throw new BadRequestException('Private drug data is missing');
    }

    return {
      tradeName: drug.privateDrug.tradeName,
      unitsPerBox: this.assertValidUnitsPerBox(drug.privateDrug.unitsPerBox),
      isDrugActive: drug.privateDrug.isActive,
    };
  }

  private assertValidUnitsPerBox(unitsPerBox: number): number {
    if (!Number.isInteger(unitsPerBox) || unitsPerBox <= 0) {
      throw new BadRequestException('Drug unitsPerBox is not configured');
    }

    return unitsPerBox;
  }

  private async reconstructExecutionForInvoice(
    tx: Prisma.TransactionClient,
    request: CheckoutRequest,
    invoice: CheckoutSaleInvoice,
  ): Promise<Map<number, ExecutionSummary>> {
    const currentInvoiceItems = invoice.items.filter(
      (item) => item.customerRequestItemId !== null,
    );

    const requestItemIds = currentInvoiceItems.map(
      (item) => item.customerRequestItemId as number,
    );

    if (requestItemIds.length === 0) {
      throw new InternalServerErrorException(
        'Customer-request invoice has no linked request items',
      );
    }

    const history = await tx.saleInvoiceItem.findMany({
      where: {
        customerRequestItemId: {
          in: requestItemIds,
        },
        saleInvoice: {
          customerRequestId: request.customerRequestId,
        },
      },
      select: {
        saleInvoiceItemId: true,
        saleInvoiceId: true,
        customerRequestItemId: true,
        baseQuantity: true,
        unitFactorToBase: true,
        saleInvoice: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    history.sort((left, right) => {
      const dateDifference =
        left.saleInvoice.createdAt.getTime() -
        right.saleInvoice.createdAt.getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      if (left.saleInvoiceId !== right.saleInvoiceId) {
        return left.saleInvoiceId - right.saleInvoiceId;
      }

      return left.saleInvoiceItemId - right.saleInvoiceItemId;
    });

    const requestItemById = new Map(
      request.items.map((item) => [item.customerRequestItemId, item]),
    );

    const currentInvoiceItemIds = new Set(
      currentInvoiceItems.map((item) => item.saleInvoiceItemId),
    );

    const appliedSoFarByRequestItemId = new Map<number, number>();
    const result = new Map<number, ExecutionSummary>();

    for (const historyItem of history) {
      const requestItemId = historyItem.customerRequestItemId;

      if (requestItemId === null) {
        continue;
      }

      const requestItem = requestItemById.get(requestItemId);

      if (!requestItem) {
        continue;
      }

      const soldQuantity = this.toDisplayQuantity(
        historyItem.baseQuantity,
        historyItem.unitFactorToBase,
      );

      const appliedSoFar = appliedSoFarByRequestItemId.get(requestItemId) ?? 0;

      const remainingBeforeInvoice = Math.max(
        requestItem.requestedQuantity - appliedSoFar,
        0,
      );

      const appliedToRequestQuantity = Math.min(
        soldQuantity,
        remainingBeforeInvoice,
      );

      const extraSaleQuantity = Math.max(
        soldQuantity - appliedToRequestQuantity,
        0,
      );

      appliedSoFarByRequestItemId.set(
        requestItemId,
        appliedSoFar + appliedToRequestQuantity,
      );

      if (currentInvoiceItemIds.has(historyItem.saleInvoiceItemId)) {
        result.set(requestItemId, {
          soldQuantity,
          appliedToRequestQuantity,
          extraSaleQuantity,
          fulfilledQuantity: requestItem.fulfilledQuantity,
          remainingQuantity: Math.max(
            requestItem.requestedQuantity - requestItem.fulfilledQuantity,
            0,
          ),
        });
      }
    }

    return result;
  }

  private buildResponse(
    request: CheckoutRequest,
    saleInvoice: CheckoutSaleInvoice,
    executionByRequestItemId: Map<number, ExecutionSummary>,
    idempotentReplay: boolean,
  ) {
    const requestItemById = new Map(
      request.items.map((item) => [item.customerRequestItemId, item]),
    );

    const items = saleInvoice.items.map((saleItem) => {
      const customerRequestItemId = saleItem.customerRequestItemId;

      if (customerRequestItemId === null) {
        throw new InternalServerErrorException(
          `saleInvoiceItemId ${saleItem.saleInvoiceItemId} is not linked to a customer-request item`,
        );
      }

      const requestItem = requestItemById.get(customerRequestItemId);
      const execution = executionByRequestItemId.get(customerRequestItemId);

      if (!requestItem || !execution) {
        throw new InternalServerErrorException(
          `Unable to build checkout response for customerRequestItemId ${customerRequestItemId}`,
        );
      }

      const drugData = this.resolveDrugData(requestItem);

      return {
        customerRequestItemId,
        saleInvoiceItemId: saleItem.saleInvoiceItemId,
        pharmacyDrugId: saleItem.pharmacyDrugId,
        tradeName: drugData.tradeName,
        unitType: saleItem.unitType,
        unitFactorToBase: saleItem.unitFactorToBase,

        requestedQuantity: requestItem.requestedQuantity,
        soldQuantity: execution.soldQuantity,
        appliedToRequestQuantity: execution.appliedToRequestQuantity,
        extraSaleQuantity: execution.extraSaleQuantity,
        fulfilledQuantity: execution.fulfilledQuantity,
        remainingQuantity: execution.remainingQuantity,

        finalUnitPrice: saleItem.finalUnitPrice,
        totalPrice: saleItem.totalPrice,
        discountAmount: saleItem.discountAmount,
        netTotalPrice: saleItem.netTotalPrice,
      };
    });

    const paymentSummary = calculateSalePaymentSummary(
      saleInvoice.totalAmount,
      saleInvoice.paidAmount,
      saleInvoice.returns.map((returnInvoice) => returnInvoice.subtotalRefund),
    );
    return {
      idempotentReplay,

      customerRequest: {
        customerRequestId: request.customerRequestId,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        status: request.status,
        completedAt: request.completedAt,
        cancelledAt: request.cancelledAt,
      },

      saleInvoice: {
        saleInvoiceId: saleInvoice.saleInvoiceId,
        pharmacyInvoiceId: saleInvoice.pharmacyInvoiceId,
        customerRequestId: saleInvoice.customerRequestId,
        saleType: saleInvoice.saleType,
        paymentStatus: saleInvoice.paymentStatus,

        subtotal: saleInvoice.subtotal,
        discount: saleInvoice.discount,
        totalAmount: saleInvoice.totalAmount,
        paidAmount: saleInvoice.paidAmount,

        ...paymentSummary,
        
        invoiceDate: saleInvoice.pharmacyInvoice.invoiceDate,
        notes: saleInvoice.pharmacyInvoice.notes,
      },

      items,
    };
  }

  private toDisplayQuantity(
    baseQuantity: number,
    unitFactorToBase: number,
  ): number {
    if (unitFactorToBase <= 0 || baseQuantity % unitFactorToBase !== 0) {
      throw new InternalServerErrorException(
        'Stored sale quantity cannot be converted to its display unit',
      );
    }

    return baseQuantity / unitFactorToBase;
  }
}
