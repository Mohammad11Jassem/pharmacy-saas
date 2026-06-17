import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { UpdatePharmacyDrugDto } from '../dto/update-pharmacy-drug.dto';

@Injectable()
export class UpdatePharmacyDrugUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    pharmacyId: number,
    pharmacyDrugId: number,
    dto: UpdatePharmacyDrugDto,
  ) {
    return this.unitOfWork.execute(
      async (tx) => {
        return this.executeWithTx(
          tx,
          pharmacyId,
          pharmacyDrugId,
          dto,
        );
      },
    );
  }

  async executeWithTx(
    tx: Prisma.TransactionClient,
    pharmacyId: number,
    pharmacyDrugId: number,
    dto: UpdatePharmacyDrugDto,
  ) {
    const pharmacyDrug =
      await tx.pharmacyDrug.findFirst({
        where: {
          pharmacyDrugId,
          pharmacyId,
        },
        select: {
          pharmacyDrugId: true,
          pharmacyId: true,
          drugId: true,
        },
      });

    if (!pharmacyDrug) {
      throw new NotFoundException(
        'Pharmacy drug not found',
      );
    }

    const hasConsumerPrice =
      dto.consumerPrice !== undefined;

    const hasMinStockAlert =
      dto.minStockAlert !== undefined;

    const hasSellPart =
      dto.sellPart !== undefined;

    const hasExpiryDateAlarm =
      dto.expiryDateAlarm !== undefined;

    const hasIsActive =
      dto.isActive !== undefined;

    const hasNotes =
      dto.notes !== undefined;

    if (
      !hasConsumerPrice &&
      !hasMinStockAlert &&
      !hasSellPart &&
      !hasExpiryDateAlarm &&
      !hasIsActive &&
      !hasNotes
    ) {
      throw new BadRequestException(
        'At least one editable field is required',
      );
    }

    const data: Prisma.PharmacyDrugUpdateInput = {};

    if (hasMinStockAlert) {
      data.minStockAlert = dto.minStockAlert;
    }

    if (hasSellPart) {
      data.sellPart = dto.sellPart;
    }

    if (hasConsumerPrice) {
      data.consumerPrice = dto.consumerPrice;
    }

    if (hasExpiryDateAlarm) {
      data.expiryDateAlarm = dto.expiryDateAlarm;
    }

    if (hasIsActive) {
      data.isActive = dto.isActive;
    }

    if (hasNotes) {
      data.notes =
        dto.notes === null
          ? null
          : dto.notes?.trim();
    }

    return tx.pharmacyDrug.update({
      where: {
        pharmacyDrugId,
      },
      data,
      select: {
        pharmacyDrugId: true,
        pharmacyId: true,
        drugId: true,
        minStockAlert: true,
        sellPart: true,
        netPrice: true,
        consumerPrice: true,
        expiryDateAlarm: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}