import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationRecipientType } from '../generated/prisma/enums';
import { toPaginatedResult } from '../common/pagination/pagination.util';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  // Save notification in database.
  async create(data: {
    title: string;
    body: string;
    recipientType: NotificationRecipientType;
    recipientId: number;
  }) {
    return this.prisma.notification.create({
      data,
    });
  }

  // Get one notification by ID.
  async findById(notificationId: number) {
    return this.prisma.notification.findUnique({
      where: {
        notificationId,
      },
    });
  }

  // Get notifications for one recipient.
  async getAll(
    recipientType: NotificationRecipientType,
    recipientId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    // Keep pagination values safe.
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 100);

    const skip = (page - 1) * limit;

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: {
          recipientType,
          recipientId,
        },

        orderBy: {
          createdAt: 'desc',
        },

        skip,
        take: limit,

        select: {
          notificationId: true,
          title: true,
          body: true,
          createdAt: true,
        },
      }),

      this.prisma.notification.count({
        where: {
          recipientType,
          recipientId,
        },
      }),
    ]);

    return toPaginatedResult(notifications, total, page, limit);
    // return {
    //   data: notifications,

    //   pagination: {
    //     page,
    //     limit,
    //     total,
    //     totalPages: Math.ceil(total / limit),
    //   },
    // };
  }

  async getOwnerNotifications(userId: number,dto:PaginationQueryDto) {
    // Find the PharmacyOwner that belongs to this UserAccount.
    const owner = await this.prisma.pharmacyOwner.findUnique({
      where: {
        userId,
      },

      select: {
        pharmacyOwnerId: true,
      },
    });

    if (!owner) {
      throw new NotFoundException('Pharmacy owner not found.');
    }

    return this.getAll(
      NotificationRecipientType.PHARMACY_OWNER,
      owner.pharmacyOwnerId,
        dto.page,
        dto.limit
    );
  }

  // Get the current FCM token.
  async getFcmToken(
    recipientType: NotificationRecipientType,
    recipientId: number,
  ): Promise<string | null> {
    if (recipientType === NotificationRecipientType.PHARMACY) {
      const pharmacy = await this.prisma.pharmacy.findUnique({
        where: {
          pharmacyId: recipientId,
        },

        select: {
          fcmToken: true,
        },
      });

      return pharmacy?.fcmToken ?? null;
    }

    if (recipientType === NotificationRecipientType.PHARMACY_OWNER) {
      const owner = await this.prisma.pharmacyOwner.findUnique({
        where: {
          pharmacyOwnerId: recipientId,
        },

        select: {
          user: {
            select: {
              fcmToken: true,
            },
          },
        },
      });

      return owner?.user.fcmToken ?? null;
    }

    return null;
  }
}
