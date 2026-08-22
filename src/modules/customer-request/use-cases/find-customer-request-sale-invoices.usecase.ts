import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../../common/pagination/pagination.util';
import { GetCustomerRequestSaleInvoicesDto } from '../dto/get-customer-request-sale-invoices.dto';
import { calculateSalePaymentSummary } from '../../sale-invoice/utils/sale-payment-summary.util';

@Injectable()
export class FindCustomerRequestSaleInvoicesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    pharmacyId: number,
    customerRequestId: number,
    query: GetCustomerRequestSaleInvoicesDto,
  ) {
    const requestExists = await this.prisma.customerRequest.findFirst({
      where: {
        customerRequestId,
        pharmacyId,
      },
      select: {
        customerRequestId: true,
      },
    });

    if (!requestExists) {
      throw new NotFoundException('Customer request not found');
    }

    const { page, limit, skip, take } = getPaginationParams(
      query.page,
      query.limit,
    );

    const where: Prisma.SaleInvoiceWhereInput = {
      customerRequestId,
      pharmacyInvoice: {
        pharmacyId,
        invoiceType: PharmacyInvoiceType.SALE,
      },
    };

    const [saleInvoices, total] = await Promise.all([
      this.prisma.saleInvoice.findMany({
        where,
        select: {
          saleInvoiceId: true,
          pharmacyInvoiceId: true,
          customerRequestId: true,
          paymentStatus: true,
          saleType: true,
          subtotal: true,
          discount: true,
          totalAmount: true,
          paidAmount: true,
          createdAt: true,
          updatedAt: true,
          pharmacyInvoice: {
            select: {
              invoiceDate: true,
              status: true,
              notes: true,
            },
          },
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
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: [
          {
            pharmacyInvoice: {
              invoiceDate: 'desc',
            },
          },
          {
            saleInvoiceId: 'desc',
          },
        ],
        skip,
        take,
      }),
      this.prisma.saleInvoice.count({ where }),
    ]);

    // const mappedSaleInvoices = saleInvoices.map(
    //   ({ pharmacyInvoice, _count, ...saleInvoice }) => ({
    //     ...saleInvoice,
    //     invoiceDate: pharmacyInvoice.invoiceDate,
    //     invoiceStatus: pharmacyInvoice.status,
    //     notes: pharmacyInvoice.notes,
    //     itemsCount: _count.items,
    //   }),
    // );

    const mappedSaleInvoices = saleInvoices.map((invoice) => {
      const { pharmacyInvoice, returns, _count, ...saleInvoice } = invoice;

      const paymentSummary = calculateSalePaymentSummary(
        invoice.totalAmount,
        invoice.paidAmount,
        returns.map((returnInvoice) => returnInvoice.subtotalRefund),
      );

      return {
        ...saleInvoice,
        ...paymentSummary,
        invoiceDate: pharmacyInvoice.invoiceDate,
        invoiceStatus: pharmacyInvoice.status,
        notes: pharmacyInvoice.notes,
        itemsCount: _count.items,
      };
    });

    return toPaginatedResult(mappedSaleInvoices, total, page, limit);
  }
}
