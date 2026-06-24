import { Injectable, NotFoundException } from '@nestjs/common';
import {
  PharmacyInvoiceStatus,
  PharmacyInvoiceType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FindReturnInvoiceDetailsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pharmacyId: number, returnInvoiceId: number) {
    const returnInvoice = await this.prisma.returnInvoice.findFirst({
      where: {
        returnInvoiceId,
        pharmacyInvoice: {
          pharmacyId,
          invoiceType: PharmacyInvoiceType.RETURN,
        },
      },
      include: {
        pharmacyInvoice: {
          include: {
            patient: true,
          },
        },

        referenceSaleInvoice: {
          include: {
            pharmacyInvoice: {
              include: {
                patient: true,
              },
            },
          },
        },

        items: {
          include: {
            pharmacyDrug: {
              include: {
                drug: {
                  include: {
                    generalDrug: true,
                    privateDrug: true,
                  },
                },
              },
            },

            saleInvoiceItemBatch: {
              include: {
                batch: true,
                saleInvoiceItem: true,
              },
            },
          },
        },
      },
    });

    if (!returnInvoice) {
      throw new NotFoundException('Return invoice not found');
    }

    const saleInvoiceItemBatchIds = returnInvoice.items.map(
      (item) => item.saleInvoiceItemBatchId,
    );

    const returnedQuantityRows =
      saleInvoiceItemBatchIds.length > 0
        ? await this.prisma.returnInvoiceItem.groupBy({
            by: ['saleInvoiceItemBatchId'],
            where: {
              saleInvoiceItemBatchId: {
                in: saleInvoiceItemBatchIds,
              },
              returnInvoice: {
                pharmacyInvoice: {
                  pharmacyId,
                  invoiceType: PharmacyInvoiceType.RETURN,
                  status: PharmacyInvoiceStatus.POSTED,
                },
              },
            },
            _sum: {
              baseQuantity: true,
            },
          })
        : [];

    const totalReturnedByAllocation = new Map<number, number>();

    for (const row of returnedQuantityRows) {
      totalReturnedByAllocation.set(
        row.saleInvoiceItemBatchId,
        row._sum.baseQuantity ?? 0,
      );
    }

    return this.mapReturnInvoiceDetails(
      returnInvoice,
      totalReturnedByAllocation,
    );
  }

  private mapReturnInvoiceDetails(
    returnInvoice: Prisma.ReturnInvoiceGetPayload<{
      include: {
        pharmacyInvoice: {
          include: {
            patient: true;
          };
        };
        referenceSaleInvoice: {
          include: {
            pharmacyInvoice: {
              include: {
                patient: true;
              };
            };
          };
        };
        items: {
          include: {
            pharmacyDrug: {
              include: {
                drug: {
                  include: {
                    generalDrug: true;
                    privateDrug: true;
                  };
                };
              };
            };
            saleInvoiceItemBatch: {
              include: {
                batch: true;
                saleInvoiceItem: true;
              };
            };
          };
        };
      };
    }>,
    totalReturnedByAllocation: Map<number, number>,
  ) {
    return {
      returnInvoiceId: returnInvoice.returnInvoiceId,
      pharmacyInvoiceId: returnInvoice.pharmacyInvoiceId,
      referenceSaleInvoiceId: returnInvoice.referenceSaleInvoiceId,

      subtotalRefund: this.toNumber(returnInvoice.subtotalRefund),

      createdAt: returnInvoice.createdAt,
      updatedAt: returnInvoice.updatedAt,

      pharmacyInvoice: {
        pharmacyInvoiceId: returnInvoice.pharmacyInvoice.pharmacyInvoiceId,
        pharmacyId: returnInvoice.pharmacyInvoice.pharmacyId,
        patientId: returnInvoice.pharmacyInvoice.patientId,
        invoiceType: returnInvoice.pharmacyInvoice.invoiceType,
        invoiceDate: returnInvoice.pharmacyInvoice.invoiceDate,
        status: returnInvoice.pharmacyInvoice.status,
        notes: returnInvoice.pharmacyInvoice.notes,
        idempotencyKey: returnInvoice.pharmacyInvoice.idempotencyKey,

        patient: returnInvoice.pharmacyInvoice.patient
          ? {
              patientId: returnInvoice.pharmacyInvoice.patient.patientId,
              fullName: returnInvoice.pharmacyInvoice.patient.fullName,
              phone: returnInvoice.pharmacyInvoice.patient.phone,
              nationalId: returnInvoice.pharmacyInvoice.patient.nationalId,
            }
          : null,
      },

      referenceSaleInvoice: returnInvoice.referenceSaleInvoice
        ? {
            saleInvoiceId: returnInvoice.referenceSaleInvoice.saleInvoiceId,
            pharmacyInvoiceId:
              returnInvoice.referenceSaleInvoice.pharmacyInvoiceId,
            paymentStatus: returnInvoice.referenceSaleInvoice.paymentStatus,
            saleType: returnInvoice.referenceSaleInvoice.saleType,
            subtotal: this.toNumber(
              returnInvoice.referenceSaleInvoice.subtotal,
            ),
            discount: this.toNumber(
              returnInvoice.referenceSaleInvoice.discount,
            ),
            totalAmount: this.toNumber(
              returnInvoice.referenceSaleInvoice.totalAmount,
            ),

            pharmacyInvoice: {
              pharmacyInvoiceId:
                returnInvoice.referenceSaleInvoice.pharmacyInvoice
                  .pharmacyInvoiceId,
              invoiceDate:
                returnInvoice.referenceSaleInvoice.pharmacyInvoice.invoiceDate,
              status: returnInvoice.referenceSaleInvoice.pharmacyInvoice.status,
              notes: returnInvoice.referenceSaleInvoice.pharmacyInvoice.notes,

              patient: returnInvoice.referenceSaleInvoice.pharmacyInvoice
                .patient
                ? {
                    patientId:
                      returnInvoice.referenceSaleInvoice.pharmacyInvoice.patient
                        .patientId,
                    fullName:
                      returnInvoice.referenceSaleInvoice.pharmacyInvoice.patient
                        .fullName,
                    phone:
                      returnInvoice.referenceSaleInvoice.pharmacyInvoice.patient
                        .phone,
                    nationalId:
                      returnInvoice.referenceSaleInvoice.pharmacyInvoice.patient
                        .nationalId,
                  }
                : null,
            },
          }
        : null,

      items: returnInvoice.items.map((item) => {
        const displayQuantity = this.resolveDisplayQuantity(
          item.baseQuantity,
          item.unitFactorToBase,
        );

        const originalSaleItem = item.saleInvoiceItemBatch.saleInvoiceItem;

        const originalSoldDisplayQuantity = this.resolveDisplayQuantity(
          item.saleInvoiceItemBatch.baseQuantity,
          originalSaleItem.unitFactorToBase,
        );

        const totalReturnedBaseQuantity =
          totalReturnedByAllocation.get(item.saleInvoiceItemBatchId) ?? 0;

        const remainingReturnableBaseQuantity =
          item.saleInvoiceItemBatch.baseQuantity - totalReturnedBaseQuantity;

        return {
          returnInvoiceItemId: item.returnInvoiceItemId,
          returnInvoiceId: item.returnInvoiceId,

          pharmacyDrugId: item.pharmacyDrugId,

          drug: this.mapDrug(item.pharmacyDrug),

          saleInvoiceItemBatchId: item.saleInvoiceItemBatchId,

          batch: {
            batchId: item.saleInvoiceItemBatch.batch.batchId,
            pharmacyDrugId: item.saleInvoiceItemBatch.batch.pharmacyDrugId,
            expiryDate: item.saleInvoiceItemBatch.batch.expiryDate,
            receivedDate: item.saleInvoiceItemBatch.batch.receivedDate,

            initialQuantity: item.saleInvoiceItemBatch.batch.initialQuantity,
            soldQuantity: item.saleInvoiceItemBatch.batch.soldQuantity,
            availableQuantity:
              item.saleInvoiceItemBatch.batch.initialQuantity -
              item.saleInvoiceItemBatch.batch.soldQuantity,

            status: item.saleInvoiceItemBatch.batch.status,
          },

          unitType: item.unitType,

          displayQuantity,
          baseQuantity: item.baseQuantity,
          unitFactorToBase: item.unitFactorToBase,

          unitPrice: this.toNumber(item.unitPrice),
          totalPrice: this.toNumber(item.totalPrice),

          returnReason: item.returnReason,
          restockToInventory: item.restockToInventory,

          originalSaleSnapshot: {
            saleInvoiceItemId: originalSaleItem.saleInvoiceItemId,
            saleUnitType: originalSaleItem.unitType,

            soldFromThisBatchBaseQuantity:
              item.saleInvoiceItemBatch.baseQuantity,

            soldFromThisBatchDisplayQuantity: originalSoldDisplayQuantity,

            saleItemBaseQuantity: originalSaleItem.baseQuantity,
            saleItemUnitFactorToBase: originalSaleItem.unitFactorToBase,

            saleBaseUnitPrice: this.toNumber(originalSaleItem.baseUnitPrice),
            saleFinalUnitPrice: this.toNumber(originalSaleItem.finalUnitPrice),
            saleTotalPrice: this.toNumber(originalSaleItem.totalPrice),
          },

          returnSummaryForThisAllocation: {
            originalSoldBaseQuantity: item.saleInvoiceItemBatch.baseQuantity,
            returnedInThisInvoiceBaseQuantity: item.baseQuantity,
            totalReturnedBaseQuantity,
            remainingReturnableBaseQuantity,
          },
        };
      }),
    };
  }

  private mapDrug(
    pharmacyDrug: Prisma.PharmacyDrugGetPayload<{
      include: {
        drug: {
          include: {
            generalDrug: true;
            privateDrug: true;
          };
        };
      };
    }>,
  ) {
    const generalDrug = pharmacyDrug.drug.generalDrug;
    const privateDrug = pharmacyDrug.drug.privateDrug;

    return {
      pharmacyDrugId: pharmacyDrug.pharmacyDrugId,
      drugId: pharmacyDrug.drugId,
      source: pharmacyDrug.drug.source,
      sellPart: pharmacyDrug.sellPart,
      consumerPrice: this.toNullableNumber(pharmacyDrug.consumerPrice),
      isActive: pharmacyDrug.isActive,

      tradeName:
        pharmacyDrug.drug.source === 'GENERAL'
          ? (generalDrug?.tradeName ?? null)
          : (privateDrug?.tradeName ?? null),

      barcode:
        pharmacyDrug.drug.source === 'GENERAL'
          ? (generalDrug?.barcode ?? null)
          : (privateDrug?.barcode ?? null),

      dosageFormId:
        pharmacyDrug.drug.source === 'GENERAL'
          ? (generalDrug?.dosageFormId ?? null)
          : (privateDrug?.dosageFormId ?? null),

      unitsPerBox:
        pharmacyDrug.drug.source === 'GENERAL'
          ? (generalDrug?.unitsPerBox ?? null)
          : (privateDrug?.unitsPerBox ?? null),
    };
  }

  private resolveDisplayQuantity(
    baseQuantity: number,
    unitFactorToBase: number,
  ): number | null {
    if (!unitFactorToBase || unitFactorToBase <= 0) {
      return null;
    }

    return baseQuantity / unitFactorToBase;
  }

  private toNumber(value: unknown): number {
    return Number(value);
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return Number(value);
  }
}
