// import { BadRequestException } from '@nestjs/common';
// import { Prisma } from '../../../generated/prisma/client';
// import { CreatePharmacyDrugBatchDto } from '../dto/create-pharmacy-drug-batch.dto';

// export async function createPharmacyDrugBatchesWithTx(
//   tx: Prisma.TransactionClient,
//   pharmacyDrugId: number,
//   batches?: CreatePharmacyDrugBatchDto[],
// ) {
//   if (!batches || batches.length === 0) {
//     return [];
//   }

//   for (const batch of batches) {
//     if (batch.initialQuantity <= 0) {
//       throw new BadRequestException(
//         'Batch initialQuantity must be greater than 0',
//       );
//     }

//     if (
//       batch.expiryDate &&
//       batch.receivedDate &&
//       new Date(batch.expiryDate).getTime() <
//         new Date(batch.receivedDate).getTime()
//     ) {
//       throw new BadRequestException(
//         'Batch expiryDate cannot be before receivedDate',
//       );
//     }
//   }

//   const createdBatches = [];

//   for (const batch of batches) {
//     const createdBatch = await tx.batch.create({
//       data: {
//         pharmacyDrugId,

//         supplierInvoiceItemId: null,

//         // initialQuantity:
//         //   batch.initialQuantity,
//         initialQuantity:
//           batch.initialQuantity ,

//         soldQuantity: 0,

//         expiryDate:
//           batch.expiryDate
//             ? new Date(batch.expiryDate)
//             : undefined,

//         receivedDate:
//           batch.receivedDate
//             ? new Date(batch.receivedDate)
//             : new Date(),
//       },
//     });

//     createdBatches.push(createdBatch);
//   }

//   return createdBatches;
// }

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { CreatePharmacyDrugBatchDto } from '../dto/create-pharmacy-drug-batch.dto';

export async function createPharmacyDrugBatchesWithTx(
  tx: Prisma.TransactionClient,
  pharmacyDrugId: number,
  unitsPerBox: number,
  batches?: CreatePharmacyDrugBatchDto[],
) {
  if (!batches || batches.length === 0) {
    return [];
  }

  const normalizedUnitsPerBox = Number(unitsPerBox);

  if (!Number.isInteger(normalizedUnitsPerBox) || normalizedUnitsPerBox <= 0) {
    throw new BadRequestException('unitsPerBox must be a positive integer');
  }

  for (const batch of batches) {
    const boxQuantity = Number(batch.initialQuantity);

    if (!Number.isInteger(boxQuantity) || boxQuantity <= 0) {
      throw new BadRequestException(
        'Batch initialQuantity must be a positive integer',
      );
    }

    if (
      batch.expiryDate &&
      batch.receivedDate &&
      new Date(batch.expiryDate).getTime() <
        new Date(batch.receivedDate).getTime()
    ) {
      throw new BadRequestException(
        'Batch expiryDate cannot be before receivedDate',
      );
    }
  }

  const createdBatches = [];

  for (const batch of batches) {
    // Quantity received from frontend represents boxes
    const boxQuantity = Number(batch.initialQuantity);

    // Store quantity as base units
    const initialBaseQuantity = boxQuantity * normalizedUnitsPerBox;

    const createdBatch = await tx.batch.create({
      data: {
        pharmacyDrugId,

        supplierInvoiceItemId: null,

        initialQuantity: initialBaseQuantity,

        soldQuantity: 0,

        expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : undefined,

        receivedDate: batch.receivedDate
          ? new Date(batch.receivedDate)
          : new Date(),
      },
    });

    createdBatches.push(createdBatch);
  }

  return createdBatches;
}
