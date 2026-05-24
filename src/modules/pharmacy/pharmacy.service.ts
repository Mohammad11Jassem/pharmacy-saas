import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CodeType } from '../../common/Enums/code-type.enum';
import { CodeGenerationService } from '../../common/code-generation/code-generation.service';
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

type TransactionClient = Prisma.TransactionClient;

type PharmacyAccountResult = {
  owner: {
    userId: number;
    pharmacyOwnerId: number;
    fullName: string;
    email: string;
    accountType: string;
    status: string;
    loginCode: string;
  };
  pharmacy: {
    pharmacyId: number;
    pharmacyName: string;
    pharmacyCode: string;
    status: string;
  };
  credential: {
    pharmacyCredentialId: number;
    loginCode: string;
    activatedAt: Date | null;
  };
};

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

    return tx.pharmacy.create({
      data: {
        pharmacyOwnerId,
        pharmacistLicenseNo: dto.pharmacistLicenseNo,
        pharmacyName: dto.pharmacyName,
        pharmacyCode: dto.pharmacyCode,
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
  }

  private async ensurePharmacyDataIsUnique(
    tx: TransactionClient,
    dto: CreatePharmacyDto,
  ) {
    const existingPharmacyByCode = await tx.pharmacy.findUnique({
      where: {
        pharmacyCode: dto.pharmacyCode,
      },
    });

    if (existingPharmacyByCode) {
      throw new ConflictException('Pharmacy code is already used.');
    }

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
}
