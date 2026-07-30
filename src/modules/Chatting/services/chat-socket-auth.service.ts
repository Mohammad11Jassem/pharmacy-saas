import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { Socket } from 'socket.io';

import {
  AccountType,
  PharmacyStatus,
} from '../../../generated/prisma/enums.js';

import {
  PrismaService,
} from '../../../prisma/prisma.service.js';

type ChatAccessTokenPayload = {
  sub: number;
  email?: string;
  accountType?: AccountType;
  type?: 'access' | 'refresh';
};

export type AuthenticatedChatSocketData = {
  pharmacyId: number;
};

@Injectable()
export class ChatSocketAuthService {
  constructor(
    private readonly jwtService: JwtService,

    private readonly configService:
      ConfigService,

    private readonly prisma:
      PrismaService,
  ) {}

  async authenticate(
    client: Socket,
  ): Promise<AuthenticatedChatSocketData> {
    const token =
      this.extractAccessToken(client);

    if (!token) {
      throw new UnauthorizedException(
        'Access token is required.',
      );
    }

    const secret =
      this.configService.get<string>(
        'JWT_SECRET',
      );

    if (!secret) {
      throw new Error(
        'JWT_SECRET is not configured.',
      );
    }

    let payload: ChatAccessTokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<
          ChatAccessTokenPayload
        >(token, {
          secret,

          audience:
            this.configService.get<string>(
              'JWT_TOKEN_AUDIENCE',
            ),

          issuer:
            this.configService.get<string>(
              'JWT_TOKEN_ISSUER',
            ),
        });
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired access token.',
      );
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException(
        'An access token is required.',
      );
    }

    if (
      payload.accountType !==
      AccountType.PHARMACY
    ) {
      throw new UnauthorizedException(
        'Only pharmacy accounts may connect.',
      );
    }

    if (
      !Number.isInteger(payload.sub) ||
      payload.sub <= 0
    ) {
      throw new UnauthorizedException(
        'The access token contains an invalid pharmacy identifier.',
      );
    }

    const pharmacy =
      await this.prisma.pharmacy.findUnique({
        where: {
          pharmacyId: payload.sub,
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
      throw new UnauthorizedException(
        'Pharmacy account was not found.',
      );
    }

    if (
      pharmacy.status !==
      PharmacyStatus.ACTIVE
    ) {
      throw new UnauthorizedException(
        'Pharmacy account is not active.',
      );
    }

    if (!pharmacy.credential?.activatedAt) {
      throw new UnauthorizedException(
        'Pharmacy account is not activated.',
      );
    }

    if (
      pharmacy.credential.lockedUntil &&
      pharmacy.credential.lockedUntil >
        new Date()
    ) {
      throw new UnauthorizedException(
        'Pharmacy account is temporarily locked.',
      );
    }

    return {
      pharmacyId:
        pharmacy.pharmacyId,
    };
  }

  private extractAccessToken(
    client: Socket,
  ): string | null {
    /*
     * الطريقة الأساسية:
     *
     * io(url, {
     *   auth: { token: accessToken }
     * })
     */
    const authToken =
      client.handshake.auth?.token;

    if (
      typeof authToken === 'string' &&
      authToken.trim()
    ) {
      return this.normalizeToken(
        authToken,
      );
    }

    /*
     * دعم Authorization Header للاختبارات
     * أو تطبيقات Node/React Native.
     */
    const authorization =
      client.handshake.headers
        .authorization;

    if (
      typeof authorization === 'string'
    ) {
      return this.normalizeToken(
        authorization,
      );
    }

    return null;
  }

  private normalizeToken(
    value: string,
  ): string | null {
    const normalized =
      value.trim();

    if (!normalized) {
      return null;
    }

    if (
      normalized
        .toLowerCase()
        .startsWith('bearer ')
    ) {
      const token = normalized
        .slice(7)
        .trim();

      return token || null;
    }

    return normalized;
  }
}