import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { UnitOfWork } from "../../../common/TransactionWrapper/unit-of-work";
import { AddPrivateDrugDto } from "../dto/add-private-drug.dto";
import { DrugSource } from "../../../generated/prisma/enums";
import { createPharmacyDrugBatchesWithTx } from "../helpers/create-pharmacy-drug-batches.helper";

@Injectable()
export class AddPrivateDrugUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    pharmacyId: number,
    dto: AddPrivateDrugDto,
  ) {
    return this.unitOfWork.execute(
      async (tx) => {
        const dosageForm =
          await tx.dosageForm.findUnique({
            where: {
              dosageFormId:
                dto.dosageFormId,
            },
          });

        if (!dosageForm) {
          throw new NotFoundException(
            'Dosage form not found',
          );
        }

        const barcodeExists =
          await tx.privateDrug.findUnique({
            where: {
              barcode: dto.barcode,
            },
          });

        if (barcodeExists) {
          throw new ConflictException(
            'Barcode already exists',
          );
        }
        if (dto.categoryIds?.length) {
          const existingCategories =
            await tx.drugCategory.findMany({
              where: {
                categoryId: {
                  in: dto.categoryIds,
                },
              },
              select: {
                categoryId: true,
              },
            });

          if (
            existingCategories.length !==
            dto.categoryIds.length
          ) {
            throw new NotFoundException(
              'One or more categories not found',
            );
          }
        }

        if (dto.ingredients?.length) {
          const ingredientIds =
            dto.ingredients.map(
              (item) => item.ingredientId,
            );

          const existingIngredients =
            await tx.activeIngredient.findMany({
              where: {
                ingredientId: {
                  in: ingredientIds,
                },
              },
              select: {
                ingredientId: true,
              },
            });

          if (
            existingIngredients.length !==
            ingredientIds.length
          ) {
            throw new NotFoundException(
              'One or more ingredients not found',
            );
          }
        }
        const drug = await tx.drug.create({
          data: {
            source: DrugSource.PRIVATE,
          },
        });

        const privateDrug =
          await tx.privateDrug.create({
            data: {
              drugId: drug.drugId,

              dosageFormId:
                dto.dosageFormId,

              tradeName:
                dto.tradeName.trim(),

              barcode:
                dto.barcode.trim(),

              unitsPerBox:
                dto.unitsPerBox,

              isRx:
                dto.isRx ?? false,
            },
          });
          if (dto.categoryIds?.length) {
          await tx.privateDrugCategoryAssignment.createMany({
            data: dto.categoryIds.map((categoryId) => ({
              privateDrugId:
                privateDrug.privateDrugId,

              categoryId,
            })),
          });
        }

        if (dto.ingredients?.length) {
          await tx.privateDrugIngredient.createMany({
            data: dto.ingredients.map((item) => ({
              privateDrugId:
                privateDrug.privateDrugId,

              ingredientId:
                item.ingredientId,

              strengthValue:
                item.strengthValue,

              unit:
                item.unit?.trim(),
            })),
          });
        }
        const pharmacyDrug =
          await tx.pharmacyDrug.create({
            data: {
              pharmacyId,

              drugId:
                drug.drugId,

              minStockAlert:
                dto.minStockAlert,

              sellPart:
                dto.sellPart ?? false,

              netPrice:
                dto.netPrice,

              consumerPrice:
                dto.consumerPrice,

              notes:
                dto.notes?.trim(),
            },
          });

        if (dto.storageLocation) {
          await tx.drugLocation.create({
            data: {
              pharmacyDrugId:
                pharmacyDrug.pharmacyDrugId,

              storageLocation:
                dto.storageLocation.trim(),
            },
          });
        }

        const batches =
          await createPharmacyDrugBatchesWithTx(
            tx,
            pharmacyDrug.pharmacyDrugId,
            dto.batches,
          );
        return {
          pharmacyDrug,
          batches,
        };
        // return {
        //   pharmacyDrugId:
        //     pharmacyDrug.pharmacyDrugId,

        //   drugId:
        //     drug.drugId,

        //   privateDrugId:
        //     privateDrug.privateDrugId,
        // };
      },
    );
  }
}
