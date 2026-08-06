import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class InvoiceActivityService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    pharmacyId: number,
    message: string,
  ): Promise<void> {
    const normalizedMessage =
      message.trim();

    if (!normalizedMessage) {
      throw new InternalServerErrorException(
        'Invoice activity message is empty.',
      );
    }

    await this.prisma.invoiceActivity.create({
      data: {
        pharmacyId,
        message: normalizedMessage,
      },
    });
  }
}