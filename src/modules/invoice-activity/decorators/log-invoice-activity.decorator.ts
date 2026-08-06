import { SetMetadata } from '@nestjs/common';

import { INVOICE_ACTIVITY_MESSAGE_KEY } from '../constants/invoice-activity.constants';

/**
 * Store an activity after the endpoint succeeds.
 */
export const LogInvoiceActivity = (
  message: string,
) =>
  SetMetadata(
    INVOICE_ACTIVITY_MESSAGE_KEY,
    message,
  );