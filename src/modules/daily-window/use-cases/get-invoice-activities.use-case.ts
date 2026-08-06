// import { Injectable } from '@nestjs/common';

// import { PrismaService } from '../../../prisma/prisma.service';

// import { parseDateOnly } from '../utils/date-only.util';

// @Injectable()
// export class GetInvoiceActivitiesUseCase {
//   constructor(
//     private readonly prisma: PrismaService,
//   ) {}

//   async execute(
//     pharmacyId: number,
//     date: string,
//     page: number,
//     limit: number,
//   ) {
//     const activityDate =
//       parseDateOnly(date);

//     const skip =
//       (page - 1) * limit;

//     const where = {
//       pharmacyId,
//       activityDate,
//     };

//     const [
//       activities,
//       totalItems,
//     ] = await this.prisma.$transaction([
//       this.prisma.invoiceActivityLog.findMany({
//         where,

//         skip,
//         take: limit,

//         orderBy: {
//           occurredAt: 'desc',
//         },

//         select: {
//           invoiceActivityLogId: true,
//           activityType: true,
//           referenceId: true,
//           message: true,
//           activityDate: true,
//           occurredAt: true,
//         },
//       }),

//       this.prisma.invoiceActivityLog.count({
//         where,
//       }),
//     ]);

//     return {
//       items: activities,

//       meta: {
//         page,
//         limit,
//         totalItems,

//         totalPages:
//           Math.ceil(totalItems / limit),
//       },
//     };
//   }
// }