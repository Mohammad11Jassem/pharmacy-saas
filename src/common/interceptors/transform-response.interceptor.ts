import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE } from '../decorators/response-message.decorator';
import {
  ApiSuccessResponse,
  PaginatedResult,
  PaginationMeta,
} from '../interfaces/api-response.interface';

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<T>> {
    const ctx = context.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Request completed successfully';

    return next.handle().pipe(
      map((result: unknown) => {
        const baseResponse = {
          success: true as const,
          statusCode: response.statusCode,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        if (isPaginatedResult(result)) {
          return {
            ...baseResponse,
            data: result.items,
            meta: result.meta,
          } as ApiSuccessResponse<T>;
        }

        return {
          ...baseResponse,
          data: result as T,
        };
      }),
    );
  }
}

function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as {
    items?: unknown;
    meta?: PaginationMeta;
  };

  return Array.isArray(result.items) && Boolean(result.meta);
}