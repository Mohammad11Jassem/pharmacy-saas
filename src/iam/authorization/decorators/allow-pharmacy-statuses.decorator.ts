import { SetMetadata } from '@nestjs/common';
import { PharmacyStatus } from '../../../generated/prisma/enums';

export const ALLOWED_PHARMACY_STATUSES_KEY = 'allowed_pharmacy_statuses';

export const AllowPharmacyStatuses = (...statuses: PharmacyStatus[]) =>
  SetMetadata(ALLOWED_PHARMACY_STATUSES_KEY, statuses);