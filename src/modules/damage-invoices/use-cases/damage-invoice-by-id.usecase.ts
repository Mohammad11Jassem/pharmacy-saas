import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { damageInvoiceDetailsSelect, mapDamageInvoiceDetails } from '../mapper/damage-invoice-details.mapper';


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

        select:
          damageInvoiceDetailsSelect,
      });

    if (!damageInvoice) {
      throw new NotFoundException(
        'Damage invoice not found',
      );
    }

    return mapDamageInvoiceDetails(
      damageInvoice,
    );
  }
}