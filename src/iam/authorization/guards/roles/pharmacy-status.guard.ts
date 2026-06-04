import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  AccountType,
  PharmacyStatus,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../../prisma/prisma.service';
import { REQUEST_USER_KEY } from '../../../iam.constant';
import { ActiveUserData } from '../../../interfaces/actice-user-data.interface';
import { ALLOWED_PHARMACY_STATUSES_KEY } from '../../decorators/allow-pharmacy-statuses.decorator';
import { SKIP_PHARMACY_STATUS_CHECK_KEY } from '../../decorators/skip-pharmacy-status-check.decorator';

type RequestWithUser = Request & {
  [REQUEST_USER_KEY]?: ActiveUserData;
};

@Injectable()
export class PharmacyStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_PHARMACY_STATUS_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const activeUser = request[REQUEST_USER_KEY];

    /**
     * إذا لم يوجد user، نترك AuthenticationGuard يتعامل مع المصادقة.
     */
    if (!activeUser) {
      return true;
    }

    /**
     * هذا الغارد يطبق فقط على حسابات الصيدليات.
     * ADMIN / PHARMACY_OWNER / MEDICAL_TEAM يمرون بدون فحص حالة الصيدلية.
     */
    if (activeUser.accountType !== AccountType.PHARMACY) {
      return true;
    }

    /**
     * في توكن الصيدلية:
     * sub = pharmacyId
     */
    const pharmacyId = activeUser.sub;

    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: {
        pharmacyId,
      },
      select: {
        pharmacyId: true,
        status: true,
        credential: {
          select: {
            activatedAt: true,
            lockedUntil: true,
          },
        },
      },
    });

    if (!pharmacy) {
      throw new ForbiddenException('Pharmacy account was not found.');
    }

    if (!pharmacy.credential?.activatedAt) {
      throw new ForbiddenException('Pharmacy account is not activated yet.');
    }

    if (
      pharmacy.credential.lockedUntil &&
      pharmacy.credential.lockedUntil > new Date()
    ) {
      throw new ForbiddenException('Pharmacy account is temporarily locked.');
    }

    const allowedStatuses =
      this.reflector.getAllAndOverride<PharmacyStatus[]>(
        ALLOWED_PHARMACY_STATUSES_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [PharmacyStatus.ACTIVE];

    if (!allowedStatuses.includes(pharmacy.status)) {
      throw new ForbiddenException(
        `Pharmacy is ${pharmacy.status}. Allowed statuses: ${allowedStatuses.join(
          ', ',
        )}.`,
      );
    }

    return true;
  }
}