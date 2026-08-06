import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { Request } from 'express';

import { concatMap, from, map, Observable } from 'rxjs';

import { INVOICE_ACTIVITY_MESSAGE_KEY } from '../constants/invoice-activity.constants';

import { InvoiceActivityService } from '../services/invoice-activity.service';

type AuthenticatedRequest = Request & {
  user?: {
    sub?: number | string;
  };
};

@Injectable()
export class InvoiceActivityInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,

    private readonly activityService: InvoiceActivityService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const message = this.reflector.getAllAndOverride<string>(
      INVOICE_ACTIVITY_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    /**
     * Continue normally when the endpoint
     * does not use the activity decorator.
     */
    if (!message) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const pharmacyId = Number(request.user?.sub);

    if (!Number.isInteger(pharmacyId) || pharmacyId <= 0) {
      throw new UnauthorizedException('Pharmacy identity is missing.');
    }

    /**
     * concatMap runs only after the endpoint succeeds.
     *
     * If next.handle() throws an exception,
     * this code will not store an activity.
     */
    return next.handle().pipe(
      concatMap((response) =>
        from(this.activityService.create(pharmacyId, message)).pipe(
          /**
           * Return the original API response
           * after storing the activity.
           */
          map(() => response),
        ),
      ),
    );
  }
}
