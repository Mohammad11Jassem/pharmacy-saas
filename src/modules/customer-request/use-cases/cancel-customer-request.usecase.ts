import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import {
  CustomerRequestItemStatus,
  CustomerRequestStatus,
  Prisma,
} from '../../../generated/prisma/client';

const cancelCustomerRequestSelect = {
  customerRequestId: true,
  pharmacyId: true,
  customerName: true,
  customerPhone: true,
  notes: true,
  status: true,
  requestedAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: {
      customerRequestItemId: 'asc',
    },
    select: {
      customerRequestItemId: true,
      customerRequestId: true,
      pharmacyDrugId: true,
      requestedQuantity: true,
      fulfilledQuantity: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      pharmacyDrug: {
        select: {
          drug: {
            select: {
              generalDrug: {
                select: {
                  tradeName: true,
                },
              },
              privateDrug: {
                select: {
                  tradeName: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CustomerRequestSelect;

type CancelCustomerRequestRecord = Prisma.CustomerRequestGetPayload<{
  select: typeof cancelCustomerRequestSelect;
}>;

@Injectable()
export class CancelCustomerRequestUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  execute(pharmacyId: number, customerRequestId: number) {
    return this.unitOfWork.executeSerializable(async (tx) => {
      const request = await tx.customerRequest.findFirst({
        where: {
          customerRequestId,
          pharmacyId,
        },
        select: cancelCustomerRequestSelect,
      });

      if (!request) {
        throw new NotFoundException('Customer request not found');
      }

      if (request.status === CustomerRequestStatus.COMPLETED) {
        throw new ConflictException(
          'Completed customer request cannot be cancelled',
        );
      }

      /**
       * نجعل عملية الإلغاء idempotent.
       * عند إعادة نفس الطلب بعد نجاحه لا نعدّل البيانات مرة ثانية،
       * بل نعيد الحالة الحالية للطلب.
       */
      if (request.status === CustomerRequestStatus.CANCELLED) {
        return this.buildResponse(request, request.status, true);
      }

      const previousStatus = request.status;
      const cancelledAt = new Date();

      for (const item of request.items) {
        /**
         * العناصر المنفذة بالكامل تبقى FULFILLED.
         * أما الكمية غير المنفذة أو المنفذة جزئياً فتُلغى،
         * مع الاحتفاظ بقيمة fulfilledQuantity كما هي.
         */
        const newItemStatus =
          item.fulfilledQuantity >= item.requestedQuantity
            ? CustomerRequestItemStatus.FULFILLED
            : CustomerRequestItemStatus.CANCELLED;

        if (item.status !== newItemStatus) {
          await tx.customerRequestItem.update({
            where: {
              customerRequestItemId: item.customerRequestItemId,
            },
            data: {
              status: newItemStatus,
            },
          });

          item.status = newItemStatus;
        }
      }

      await tx.customerRequest.update({
        where: {
          customerRequestId,
        },
        data: {
          status: CustomerRequestStatus.CANCELLED,
          cancelledAt,
          completedAt: null,
        },
      });

      request.status = CustomerRequestStatus.CANCELLED;
      request.cancelledAt = cancelledAt;
      request.completedAt = null;

      return this.buildResponse(request, previousStatus, false);
    });
  }

  private buildResponse(
    request: CancelCustomerRequestRecord,
    previousStatus: CustomerRequestStatus,
    idempotentReplay: boolean,
  ) {
    const items = request.items.map(({ pharmacyDrug, ...item }) => {
      const remainingQuantity = Math.max(
        item.requestedQuantity - item.fulfilledQuantity,
        0,
      );

      return {
        ...item,
        tradeName:
          pharmacyDrug.drug.generalDrug?.tradeName ??
          pharmacyDrug.drug.privateDrug?.tradeName ??
          null,
        remainingQuantity,
        cancelledRemainingQuantity:
          item.status === CustomerRequestItemStatus.CANCELLED
            ? remainingQuantity
            : 0,
      };
    });

    const cancelledItemsCount = items.filter(
      (item) => item.status === CustomerRequestItemStatus.CANCELLED,
    ).length;

    const fulfilledItemsCount = items.filter(
      (item) => item.status === CustomerRequestItemStatus.FULFILLED,
    ).length;

    const cancelledRemainingQuantity = items.reduce(
      (total, item) => total + item.cancelledRemainingQuantity,
      0,
    );

    return {
      customerRequestId: request.customerRequestId,
      previousStatus,
      status: request.status,
      completedAt: request.completedAt,
      cancelledAt: request.cancelledAt,
      idempotentReplay,
      summary: {
        itemsCount: items.length,
        fulfilledItemsCount,
        cancelledItemsCount,
        cancelledRemainingQuantity,
      },
      items,
    };
  }
}
