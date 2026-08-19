import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { UpdateSupplierInvoiceDto } from './dto/update-supplier-invoice.dto';
import { Prisma, SupplierInvoiceStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierInvoiceFilterDto } from './dto/create-supplier-invoice-filter.dto';
import {
  getPaginationParams,
  toPaginatedResult,
} from '../../common/pagination/pagination.util';

@Injectable()
export class SupplierInvoiceService {
  constructor(private readonly prisma: PrismaService) {}
  async create(pharmacyId: number, dto: CreateSupplierInvoiceDto) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('items must be a non-empty array');
    }
    const requestedPharmacyDrugIds = dto.items.map(
      (item) => item.pharmacyDrugId,
    );

    const uniquePharmacyDrugIds = new Set(requestedPharmacyDrugIds);

    if (uniquePharmacyDrugIds.size !== requestedPharmacyDrugIds.length) {
      throw new BadRequestException(
        'Duplicate pharmacyDrugId is not allowed in supplier invoice items',
      );
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        return this.prisma.$transaction(
          async (tx: Prisma.TransactionClient) => {
            // 1. Verify supplier belongs to pharmacy
            await this.assertSupplierBelongsToPharmacy(
              dto.supplierId,
              pharmacyId,
              tx,
            );

            const pharmacyDrugIds = [
              ...new Set(dto.items.map((item) => item.pharmacyDrugId)),
            ];

            //verify the invoice number is unique at this pharmacy for this supplier
            if (dto.invoiceNumber?.trim()) {
              const existingInvoice = await tx.supplierInvoice.findFirst({
                where: {
                  supplierId: dto.supplierId,
                  invoiceNumber: dto.invoiceNumber.trim(),
                },
                select: {
                  supplierInvoiceId: true,
                },
              });

              if (existingInvoice) {
                throw new BadRequestException(
                  `Invoice number ${dto.invoiceNumber} already exists for this supplier`,
                );
              }
            }

            // 2. Verify pharmacy drugs belong to pharmacy
            await this.assertPharmacyDrugsBelongToPharmacy(
              pharmacyDrugIds,
              pharmacyId,
              tx,
            );

            // 3. Get unitsPerBox for every pharmacy drug
            const pharmacyDrugs = await tx.pharmacyDrug.findMany({
              where: {
                pharmacyId,
                pharmacyDrugId: {
                  in: pharmacyDrugIds,
                },
              },
              select: {
                pharmacyDrugId: true,
                drug: {
                  select: {
                    source: true,
                    generalDrug: {
                      select: {
                        unitsPerBox: true,
                      },
                    },
                    privateDrug: {
                      select: {
                        unitsPerBox: true,
                      },
                    },
                  },
                },
              },
            });

            const unitsPerBoxMap = new Map<number, number>();

            for (const pharmacyDrug of pharmacyDrugs) {
              // const unitsPerBox = Number(pharmacyDrug.drug.generalDrug?.unitsPerBox);
              const unitsPerBox = Number(
                pharmacyDrug.drug.generalDrug?.unitsPerBox ??
                  pharmacyDrug.drug.privateDrug?.unitsPerBox,
              );

              if (
                !Number.isFinite(unitsPerBox) ||
                !Number.isInteger(unitsPerBox) ||
                unitsPerBox <= 0
              ) {
                throw new BadRequestException(
                  `Invalid unitsPerBox for pharmacyDrugId ${pharmacyDrug.pharmacyDrugId}`,
                );
              }

              unitsPerBoxMap.set(pharmacyDrug.pharmacyDrugId, unitsPerBox);
            }

            // 4. Compute quantities and prices
            const computedItems = dto.items.map((item) => {
              const boxQuantity = Number(item.quantity);
              const netUnitPrice = Number(item.netUnitPrice);

              if (!Number.isFinite(boxQuantity) || boxQuantity <= 0) {
                throw new BadRequestException(
                  `Invalid quantity for pharmacyDrugId ${item.pharmacyDrugId}`,
                );
              }

              if (!Number.isFinite(netUnitPrice) || netUnitPrice < 0) {
                throw new BadRequestException(
                  `Invalid netUnitPrice for pharmacyDrugId ${item.pharmacyDrugId}`,
                );
              }

              const unitsPerBox = unitsPerBoxMap.get(item.pharmacyDrugId);

              if (!unitsPerBox) {
                throw new BadRequestException(
                  `unitsPerBox was not found for pharmacyDrugId ${item.pharmacyDrugId}`,
                );
              }

              // Convert box quantity to base units
              const baseQuantity = boxQuantity * unitsPerBox;

              // Price is calculated using number of boxes
              const totalPrice = Number(
                (boxQuantity * netUnitPrice).toFixed(2),
              );

              return {
                ...item,

                // Original quantity sent by frontend
                boxQuantity,

                // Quantity stored in database
                quantity: baseQuantity,

                unitsPerBox,
                netUnitPrice,
                totalPrice,
              };
            });

            const subtotal = Number(
              computedItems
                .reduce((sum, item) => sum + item.totalPrice, 0)
                .toFixed(2),
            );

            const discount = dto.discount ? Number(dto.discount) : 0;

            if (!Number.isFinite(discount) || discount < 0) {
              throw new BadRequestException(
                'discount must be a valid positive number',
              );
            }

            if (discount > subtotal) {
              throw new BadRequestException(
                'discount cannot be greater than subtotal',
              );
            }

            const totalPrice = Number((subtotal - discount).toFixed(2));

            const invoiceDate = dto.invoiceDate
              ? new Date(dto.invoiceDate)
              : new Date();

            // 5. Create supplier invoice with its items
            const created = await tx.supplierInvoice.create({
              data: {
                supplierId: dto.supplierId,
                // invoiceNumber: dto.invoiceNumber ?? undefined,
                invoiceNumber: dto.invoiceNumber?.trim() || undefined,
                invoiceDate,
                subtotal,
                discount,
                totalPrice,
                notes: dto.notes ?? undefined,
                status: SupplierInvoiceStatus.PENDING,

                items: {
                  create: computedItems.map((item) => ({
                    pharmacyDrug: {
                      connect: {
                        pharmacyDrugId: item.pharmacyDrugId,
                      },
                    },

                    // Stored as base units
                    quantity: item.quantity,

                    // Price of one box
                    netUnitPrice: item.netUnitPrice,
                    totalPrice: item.totalPrice,
                    notes: item.notes ?? undefined,
                  })),
                },
              },
              include: {
                items: true,
              },
            });

            // 6. Create batches
            const createdItemsByPharmacyDrugId = new Map(
              created.items.map((item) => [item.pharmacyDrugId, item]),
            );
            const batchesToCreate: Prisma.BatchCreateManyInput[] = [];

            for (const itemInput of computedItems) {
              const createdItem = createdItemsByPharmacyDrugId.get(
                itemInput.pharmacyDrugId,
              );

              if (!createdItem) {
                throw new BadRequestException(
                  `Supplier invoice item was not created for pharmacyDrugId ${itemInput.pharmacyDrugId}`,
                );
              }

              if (itemInput.batches && itemInput.batches.length > 0) {
                let totalBatchBoxQuantity = 0;
                for (const batch of itemInput.batches) {
                  /*
                   * batch.initialQuantity coming from frontend
                   * represents number of boxes.
                   */
                  const batchBoxQuantity =
                    batch.initialQuantity !== undefined &&
                    batch.initialQuantity !== null
                      ? Number(batch.initialQuantity)
                      : itemInput.batches.length === 1
                        ? itemInput.boxQuantity
                        : null;

                  if (
                    !Number.isFinite(batchBoxQuantity) ||
                    !Number.isInteger(batchBoxQuantity) ||
                    batchBoxQuantity <= 0
                  ) {
                    throw new BadRequestException(
                      `Invalid batch quantity for pharmacyDrugId ${itemInput.pharmacyDrugId}`,
                    );
                  }

                  totalBatchBoxQuantity += batchBoxQuantity;

                  if (totalBatchBoxQuantity > itemInput.boxQuantity) {
                    throw new BadRequestException(
                      `Total batch quantity cannot exceed invoice quantity for pharmacyDrugId ${itemInput.pharmacyDrugId}`,
                    );
                  }

                  // Convert batch boxes to base units
                  const batchBaseQuantity =
                    batchBoxQuantity * itemInput.unitsPerBox;

                  const receivedDate = new Date();

                  this.validateBatchExpiryDate(batch.expiryDate, receivedDate);

                  batchesToCreate.push({
                    pharmacyDrugId: itemInput.pharmacyDrugId,
                    supplierInvoiceItemId: createdItem.supplierInvoiceItemId,

                    batchNumber: batch.batchNumber?.trim() || null,

                    expiryDate: batch.expiryDate
                      ? new Date(batch.expiryDate)
                      : null,

                    initialQuantity: batchBaseQuantity,
                    receivedDate,
                  });
                }
              }
            }

            if (batchesToCreate.length > 0) {
              await tx.batch.createMany({
                data: batchesToCreate,
              });
            }

            // 7. Re-fetch the invoice after batches were created
            const invoiceWithBatches = await tx.supplierInvoice.findUnique({
              where: {
                supplierInvoiceId: created.supplierInvoiceId,
              },
              include: {
                items: {
                  include: {
                    batches: true,
                  },
                },
              },
            });

            if (!invoiceWithBatches) {
              throw new NotFoundException(
                'Supplier invoice not found after creation',
              );
            }

            // 8. Calculate stocking status
            const stockingStatus =
              this.calculateInvoiceStockingStatus(invoiceWithBatches);

            // 9. Update invoice status and return the final invoice
            return tx.supplierInvoice.update({
              where: {
                supplierInvoiceId: created.supplierInvoiceId,
              },
              data: {
                status: stockingStatus,
              },
              include: {
                items: {
                  include: {
                    batches: true,
                  },
                },
              },
            });
          },
        );
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Invoice number already exists for this supplier',
        );
      }

      throw error;
    }
  }

  private async assertSupplierBelongsToPharmacy(
    supplierId: number,
    pharmacyId: number,
    tx: Prisma.TransactionClient,
  ) {
    const s = await tx.supplier.findFirst({
      where: { supplierId, pharmacyId },
      select: { supplierId: true },
    });
    if (!s) throw new BadRequestException('Invalid supplier for this pharmacy');
    return s;
  }

  private async assertPharmacyDrugsBelongToPharmacy(
    pharmacyDrugIds: number[],
    pharmacyId: number,
    tx: Prisma.TransactionClient,
  ) {
    const ids = Array.from(new Set(pharmacyDrugIds));
    const found = await tx.pharmacyDrug.findMany({
      where: { pharmacyDrugId: { in: ids }, pharmacyId },
      select: { pharmacyDrugId: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException(
        'One or more pharmacyDrugId values are invalid for this pharmacy',
      );
    }
    return found;
  }

  async findAll(pharmacyId: number, filters: SupplierInvoiceFilterDto) {
    const {
      page: requestedPage,
      limit: requestedLimit,

      supplierId,
      status,
      paymentStatus,
      invoiceNumber,
      fromDate,
      toDate,
      pharmacyDrugId,
    } = filters;

    const { page, limit, skip, take } = getPaginationParams(
      requestedPage,
      requestedLimit,
    );
    /*
     * نبني شرط where مرة واحدة،
     * ثم نستخدمه في findMany وcount.
     */
    const where: Prisma.SupplierInvoiceWhereInput = {
      supplier: {
        pharmacyId,

        ...(supplierId !== undefined
          ? {
              supplierId,
            }
          : {}),
      },

      ...(status !== undefined
        ? {
            status,
          }
        : {}),

      ...(paymentStatus !== undefined
        ? {
            paymentStatus,
          }
        : {}),

      ...(invoiceNumber?.trim()
        ? {
            invoiceNumber: {
              contains: invoiceNumber.trim(),

              mode: 'insensitive',
            },
          }
        : {}),

      ...(fromDate || toDate
        ? {
            invoiceDate: {
              ...(fromDate
                ? {
                    gte: new Date(fromDate),
                  }
                : {}),

              ...(toDate
                ? {
                    lte: new Date(toDate),
                  }
                : {}),
            },
          }
        : {}),

      ...(pharmacyDrugId !== undefined
        ? {
            items: {
              some: {
                pharmacyDrugId,
              },
            },
          }
        : {}),
    };

    const [supplierInvoices, total] = await this.prisma.$transaction([
      this.prisma.supplierInvoice.findMany({
        where,

        skip,

        take,

        include: {
          supplier: true,

          items: {
            include: {
              pharmacyDrug: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.supplierInvoice.count({
        where,
      }),
    ]);

    return toPaginatedResult(supplierInvoices, total, page, limit);
  }

  // async findOne(pharmacyId: number, id: number) {
  //   const invoice = await this.prisma.supplierInvoice.findFirst({
  //     where: {
  //       supplierInvoiceId: id,

  //       supplier: {
  //         pharmacyId,
  //       },
  //     },

  //     // Remove timestamps from the supplier invoice.
  //     omit: {
  //       createdAt: true,
  //       updatedAt: true,
  //     },

  //     include: {
  //       supplier: {
  //         // Remove timestamps from the supplier.
  //         omit: {
  //           createdAt: true,
  //           updatedAt: true,
  //         },
  //       },

  //       items: {
  //         // Remove timestamps from every invoice item.
  //         omit: {
  //           createdAt: true,
  //           updatedAt: true,
  //         },

  //         include: {
  //           pharmacyDrug: {
  //             select: {
  //               drug: {
  //                 select: {
  //                   generalDrug: {
  //                     select: {
  //                       tradeName: true,
  //                     },
  //                   },

  //                   privateDrug: {
  //                     select: {
  //                       tradeName: true,
  //                     },
  //                   },
  //                 },
  //               },
  //             },
  //           },

  //           batches: {
  //             // Remove timestamps from every batch.
  //             omit: {
  //               createdAt: true,
  //               updatedAt: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });

  //   if (!invoice) {
  //     throw new NotFoundException('Supplier invoice not found');
  //   }

  //   // return invoice;
  //   return {
  //     ...invoice,

  //     items: invoice.items.map(({ pharmacyDrug, ...item }) => ({
  //       ...item,

  //       tradeName:
  //         pharmacyDrug.drug.generalDrug?.tradeName ??
  //         pharmacyDrug.drug.privateDrug?.tradeName ??
  //         null,
  //     })),
  //   };
  // }

  async findOne(pharmacyId: number, id: number) {
    const invoice = await this.prisma.supplierInvoice.findFirst({
      where: {
        supplierInvoiceId: id,

        supplier: {
          pharmacyId,
        },
      },

      // Remove timestamps from the supplier invoice.
      omit: {
        createdAt: true,
        updatedAt: true,
      },

      include: {
        supplier: {
          // Remove timestamps from the supplier.
          omit: {
            createdAt: true,
            updatedAt: true,
          },
        },

        items: {
          // Remove timestamps from every invoice item.
          omit: {
            createdAt: true,
            updatedAt: true,
          },

          include: {
            pharmacyDrug: {
              select: {
                drug: {
                  select: {
                    generalDrug: {
                      select: {
                        tradeName: true,
                        unitsPerBox: true,
                      },
                    },

                    privateDrug: {
                      select: {
                        tradeName: true,
                        unitsPerBox: true,
                      },
                    },
                  },
                },
              },
            },

            batches: {
              // Remove timestamps from every batch.
              omit: {
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Supplier invoice not found');
    }

    // return invoice;
    return {
      ...invoice,

      items: invoice.items.map(({ pharmacyDrug, ...item }) => {
        const unitsPerBox =
          pharmacyDrug.drug.generalDrug?.unitsPerBox ??
          pharmacyDrug.drug.privateDrug?.unitsPerBox ??
          1;

        return {
          ...item,

          quantity: item.quantity / unitsPerBox,

          batches : item.batches.map((batch) => ({
            ...batch,
            initialQuantity: batch.initialQuantity / unitsPerBox,
          })),

          tradeName:
            pharmacyDrug.drug.generalDrug?.tradeName ??
            pharmacyDrug.drug.privateDrug?.tradeName ??
            null,
        };
      }),
    };
  }

  private calculateInvoiceStockingStatus(
    invoice: Prisma.SupplierInvoiceGetPayload<{
      include: {
        items: {
          include: {
            batches: true;
          };
        };
      };
    }>,
  ): SupplierInvoiceStatus {
    const isFullyStocked = invoice.items.every((item) => {
      const totalBatchedQuantity = item.batches.reduce(
        (sum, batch) => sum + batch.initialQuantity,
        0,
      );

      return totalBatchedQuantity === item.quantity;
    });

    if (isFullyStocked) {
      return SupplierInvoiceStatus.STOCKED;
    }

    const isPartiallyStocked = invoice.items.some((item) => {
      const totalBatchedQuantity = item.batches.reduce(
        (sum, batch) => sum + batch.initialQuantity,
        0,
      );

      return totalBatchedQuantity > 0;
    });

    if (isPartiallyStocked) {
      return SupplierInvoiceStatus.PARTIALLY_STOCKED;
    }

    return SupplierInvoiceStatus.PENDING;
  }

  private validateBatchExpiryDate(
    expiryDate?: string,
    receivedDate: Date = new Date(),
  ): void {
    if (!expiryDate) {
      return;
    }

    const expiry = new Date(expiryDate);

    if (Number.isNaN(expiry.getTime())) {
      throw new BadRequestException('Invalid expiryDate');
    }

    const expiryOnly = new Date(
      expiry.getFullYear(),
      expiry.getMonth(),
      expiry.getDate(),
    );

    const receivedOnly = new Date(
      receivedDate.getFullYear(),
      receivedDate.getMonth(),
      receivedDate.getDate(),
    );

    if (expiryOnly < receivedOnly) {
      throw new BadRequestException('expiryDate cannot be before receivedDate');
    }
  }
}
