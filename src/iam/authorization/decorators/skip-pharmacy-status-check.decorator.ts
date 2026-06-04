import { SetMetadata } from '@nestjs/common';

export const SKIP_PHARMACY_STATUS_CHECK_KEY = 'skip_pharmacy_status_check';

export const SkipPharmacyStatusCheck = () =>
  SetMetadata(SKIP_PHARMACY_STATUS_CHECK_KEY, true);