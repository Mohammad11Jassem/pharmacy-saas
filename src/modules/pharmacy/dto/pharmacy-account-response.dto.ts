export type PharmacyAccountOwnerResponseDto = {
  userId: number;
  pharmacyOwnerId: number;
  fullName: string;
  email: string;
  accountType: string;
  status: string;
  loginCode: string;
};

export type PharmacyAccountPharmacyResponseDto = {
  pharmacyId: number;
  pharmacyName: string;
  pharmacyCode: string;
  status: string;
};

export type PharmacyAccountCredentialResponseDto = {
  pharmacyCredentialId: number;
  loginCode: string;
  activatedAt: Date | null;
};

export type PharmacyAccountResponseDto = {
  owner: PharmacyAccountOwnerResponseDto;
  pharmacy: PharmacyAccountPharmacyResponseDto;
  credential: PharmacyAccountCredentialResponseDto;
};