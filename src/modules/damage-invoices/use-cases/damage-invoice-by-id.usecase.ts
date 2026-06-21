import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class GetDamageInvoiceUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    pharmacyId: number,
    damageInvoiceId: number,
  ) {
    const damageInvoice =
      await this.prisma.damageInvoice.findFirst({
        where: {
          damageInvoiceId,

          pharmacyInvoice: {
            pharmacyId,
          },
        },
        select: {
          damageInvoiceId: true,
          pharmacyInvoice: {
            select: {
              pharmacyInvoiceId: true,
              invoiceDate: true,
              invoiceType: true,
              status: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          items: {
            select: {
              damageInvoiceItemId: true,
              quantityDamaged: true,
              damageReason: true,
              notes: true,

              batch: {
                select: {
                  batchId: true,
                  expiryDate: true,
                  initialQuantity: true,
                  soldQuantity: true,


                  pharmacyDrug: {
                    select: {
                      pharmacyDrugId: true,

                      drug: {
                        select: {
                          source: true,

                          generalDrug: {
                            select: {
                              tradeName: true,
                              barcode: true,
                            },
                          },

                          privateDrug: {
                            select: {
                              tradeName: true,
                              barcode: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!damageInvoice) {
      throw new NotFoundException(
        'Damage invoice not found',
      );
    }

    return damageInvoice;
  }
}