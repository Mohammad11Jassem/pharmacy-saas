import { Injectable } from '@nestjs/common';
import {
  Pharmacy,
  PharmacyCredential,
} from '../../../generated/prisma/client';
import {
  PharmacyAccountOwnerResponseDto,
  PharmacyAccountResponseDto,
} from '../dto/pharmacy-account-response.dto';

type PharmacyAccountMapperInput = {
  owner: PharmacyAccountOwnerResponseDto;
  pharmacy: Pharmacy;
  credential: PharmacyCredential;
};

@Injectable()
export class PharmacyAccountResponseMapper {
  toResponse(input: PharmacyAccountMapperInput): PharmacyAccountResponseDto {
    return {
      owner: input.owner,
      pharmacy: {
        pharmacyId: input.pharmacy.pharmacyId,
        pharmacyName: input.pharmacy.pharmacyName,
        pharmacyCode: input.pharmacy.pharmacyCode,
        status: input.pharmacy.status,
      },
      credential: {
        pharmacyCredentialId: input.credential.pharmacyCredentialId,
        loginCode: input.credential.loginCode,
        activatedAt: input.credential.activatedAt,
      },
    };
  }
}