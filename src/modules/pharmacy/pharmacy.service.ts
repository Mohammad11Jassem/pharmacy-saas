import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PharmacyOwnersService } from '../pharmacy-owners/pharmacy-owners.service';
import {
  CreatePharmacyAccountDto,
  OwnerMode,
} from './dto/create-pharmacy-account.dto';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';
import { PharmacyCredentialsService } from '../pharmacy-credentials/pharmacy-credentials.service';
import { PharmacyAccountResponseMapper } from './mappers/pharmacy-account-response.mapper';
import { PharmacyAccountResponseDto } from './dto/pharmacy-account-response.dto';
import { PharmacyStatus } from '../../generated/prisma/enums';
import { ChangePharmacyStatusDto } from './dto/change-pharmacy-status.dto';

type TransactionClient = Prisma.TransactionClient;

// type PharmacyAccountResult = {
//   owner: {
//     userId: number;
//     pharmacyOwnerId: number;
//     fullName: string;
//     email: string;
//     accountType: string;
//     status: string;
//     loginCode: string;
//   };
//   pharmacy: {
//     pharmacyId: number;
//     pharmacyName: string;
//     pharmacyCode: string;
//     status: string;
//   };
//   credential: {
//     pharmacyCredentialId: number;
//     loginCode: string;
//     activatedAt: Date | null;
//   };
// };

@Injectable()
export class PharmacyService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly codeGenerationService: CodeGenerationService,
    private readonly pharmacyOwnersService: PharmacyOwnersService,
    private readonly pharmacyCredentialsService: PharmacyCredentialsService,
    private readonly pharmacyAccountResponseMapper: PharmacyAccountResponseMapper,
  ) {}

  async createPharmacyAccount(
    dto: CreatePharmacyAccountDto,
  ): Promise<PharmacyAccountResponseDto> {
    const result = await this.prisma.$transaction(async (tx) => {
      const owner = await this.resolveOwner(tx, dto);

      const pharmacy = await this.createInsideTransaction(
        tx,
        owner.pharmacyOwnerId,
        dto.pharmacy,
      );

      const credential =
        await this.pharmacyCredentialsService.createForPharmacyAccount(
          tx,
          pharmacy.pharmacyId,
        );

      return {
        owner,
        pharmacy,
        credential,
      };
    });

    return this.pharmacyAccountResponseMapper.toResponse(result);
  }

  private async resolveOwner(
    tx: TransactionClient,
    dto: CreatePharmacyAccountDto,
  ) {
    if (dto.ownerMode === OwnerMode.NEW) {
      if (!dto.newOwner) {
        throw new BadRequestException(
          'newOwner is required when ownerMode is NEW.',
        );
      }

      return this.pharmacyOwnersService.createForPharmacyAccount(
        tx,
        dto.newOwner,
      );
    }

    if (dto.ownerMode === OwnerMode.EXISTING) {
      if (!dto.existingOwnerId) {
        throw new BadRequestException(
          'existingOwnerId is required when ownerMode is EXISTING.',
        );
      }

      return this.pharmacyOwnersService.findExistingForPharmacyAccount(
        tx,
        dto.existingOwnerId,
      );
    }

    throw new BadRequestException('Invalid ownerMode.');
  }

  async createInsideTransaction(
    tx: TransactionClient,
    pharmacyOwnerId: number,
    dto: CreatePharmacyDto,
  ) {
    await this.ensurePharmacyDataIsUnique(tx, dto);

    const pharmacy = await tx.pharmacy.create({
      data: {
        pharmacyOwnerId,
        pharmacistLicenseNo: dto.pharmacistLicenseNo,
        pharmacyName: dto.pharmacyName,
        contactPhone: dto.contactPhone,
        email: dto.email,
        governorate: dto.governorate,
        healthDirectorate: dto.healthDirectorate,
        areaName: dto.areaName,
        addressText: dto.addressText,
        status: 'PENDING',
        openingDate: dto.openingDate ? new Date(dto.openingDate) : undefined,
      },
    });

    const pharmacyCode = this.buildPharmacyCode(pharmacy.pharmacyId);

    return tx.pharmacy.update({
      where: {
        pharmacyId: pharmacy.pharmacyId,
      },
      data: {
        pharmacyCode,
      },
    });
  }

  private buildPharmacyCode(pharmacyId: number): string {
    return `PH-${pharmacyId.toString().padStart(3, '0')}`;
  }
  private async ensurePharmacyDataIsUnique(
    tx: TransactionClient,
    dto: CreatePharmacyDto,
  ) {
    if (dto.email) {
      const existingPharmacyByEmail = await tx.pharmacy.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (existingPharmacyByEmail) {
        throw new ConflictException('Pharmacy email is already used.');
      }
    }

    if (dto.pharmacistLicenseNo) {
      const existingPharmacyByLicense = await tx.pharmacy.findUnique({
        where: {
          pharmacistLicenseNo: dto.pharmacistLicenseNo,
        },
      });

      if (existingPharmacyByLicense) {
        throw new ConflictException(
          'Pharmacist license number is already used.',
        );
      }
    }
  }

  async changeStatus(id: number, dto: ChangePharmacyStatusDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: {
        pharmacyId: id,
      },
      include: {
        credential: true,
        pharmacyOwner: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!pharmacy) {
      throw new NotFoundException('Pharmacy was not found.');
    }

    if (pharmacy.status === dto.status) {
      throw new BadRequestException(`Pharmacy is already ${dto.status}.`);
    }

    this.validateStatusTransition(pharmacy.status, dto.status);

    return this.prisma.pharmacy.update({
      where: {
        pharmacyId: id,
      },
      data: {
        status: dto.status,
      },
      include: {
        credential: true,
        pharmacyOwner: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  private validateStatusTransition(
    currentStatus: PharmacyStatus,
    nextStatus: PharmacyStatus,
  ) {
    const allowedTransitions: Record<PharmacyStatus, PharmacyStatus[]> = {
      [PharmacyStatus.PENDING]: [
        PharmacyStatus.ACTIVE,
        PharmacyStatus.REJECTED,
        PharmacyStatus.SUSPENDED,
      ],
      [PharmacyStatus.ACTIVE]: [PharmacyStatus.SUSPENDED],
      [PharmacyStatus.SUSPENDED]: [
        PharmacyStatus.ACTIVE,
        PharmacyStatus.REJECTED,
      ],
      [PharmacyStatus.REJECTED]: [PharmacyStatus.PENDING],
    };

    const isAllowed = allowedTransitions[currentStatus].includes(nextStatus);

    if (!isAllowed) {
      throw new BadRequestException(
        `Cannot change pharmacy status from ${currentStatus} to ${nextStatus}.`,
      );
    }
  }
}
