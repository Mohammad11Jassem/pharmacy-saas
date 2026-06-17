import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { DrugSource } from '../../../generated/prisma/enums';
import { UpdatePrivateDrugDto } from '../dto/update-private-drug.dto';
import { UpdatePharmacyDrugUseCase } from './update-pharmacy-drug.usecase';
import { UpdatePharmacyDrugDto } from '../dto/update-pharmacy-drug.dto';

type PrivateDrugUpdateData = {
  dosageFormId?: number;
  tradeName?: string;
  barcode?: string;
  unitsPerBox?: number;
  isRx?: boolean;
  isActive?: boolean;
};

@Injectable()
export class UpdatePrivateDrugUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly updatePharmacyDrugUseCase: UpdatePharmacyDrugUseCase,

  ) {}

  async execute(
    pharmacyId: number,
    pharmacyDrugId: number,
    dto: UpdatePrivateDrugDto,
  ) {
    return this.unitOfWork.execute(
      async (tx) => {
        const hasDosageFormId =
          dto.dosageFormId !== undefined;

        const hasTradeName =
          dto.tradeName !== undefined;

        const hasBarcode =
          dto.barcode !== undefined;

        const hasUnitsPerBox =
          dto.unitsPerBox !== undefined;

        const hasIsRx =
          dto.isRx !== undefined;

        const hasIsActive =
          dto.isActive !== undefined;

        if (
          !hasDosageFormId &&
          !hasTradeName &&
          !hasBarcode &&
          !hasUnitsPerBox &&
          !hasIsRx &&
          !hasIsActive
        ) {
          throw new BadRequestException(
            'At least one editable field is required',
          );
        }

        const pharmacyDrug =
          await tx.pharmacyDrug.findFirst({
            where: {
              pharmacyDrugId,
              pharmacyId,
            },
            select: {
              pharmacyDrugId: true,
              pharmacyId: true,
              drugId: true,

              drug: {
                select: {
                  source: true,

                  privateDrug: {
                    select: {
                      privateDrugId: true,
                      barcode: true,
                    },
                  },
                },
              },
            },
          });

        if (
          !pharmacyDrug ||
          pharmacyDrug.drug.source !== DrugSource.PRIVATE ||
          !pharmacyDrug.drug.privateDrug
        ) {
          throw new NotFoundException(
            'Private pharmacy drug not found',
          );
        }

        if (hasDosageFormId) {
          const dosageForm =
            await tx.dosageForm.findUnique({
              where: {
                dosageFormId:
                  dto.dosageFormId,
              },
              select: {
                dosageFormId: true,
              },
            });

          if (!dosageForm) {
            throw new NotFoundException(
              'Dosage form not found',
            );
          }
        }

        if (hasBarcode) {
          const barcode =
            dto.barcode!.trim();

          const barcodeExists =
            await tx.privateDrug.findFirst({
              where: {
                barcode,

                privateDrugId: {
                  not: pharmacyDrug.drug.privateDrug
                    .privateDrugId,
                },
              },
              select: {
                privateDrugId: true,
              },
            });

          if (barcodeExists) {
            throw new ConflictException(
              'Barcode already exists',
            );
          }
        }

        const data: PrivateDrugUpdateData = {};

        if (hasDosageFormId) {
          data.dosageFormId =
            dto.dosageFormId;
        }

        if (hasTradeName) {
          data.tradeName =
            dto.tradeName!.trim();
        }

        if (hasBarcode) {
          data.barcode =
            dto.barcode!.trim();
        }

        if (hasUnitsPerBox) {
          data.unitsPerBox =
            dto.unitsPerBox;
        }

        if (hasIsRx) {
          data.isRx =
            dto.isRx;
        }

        if (hasIsActive) {
          data.isActive =
            dto.isActive;
        }

        const updatedPrivateDrug =
          await tx.privateDrug.update({
            where: {
              privateDrugId:
                pharmacyDrug.drug.privateDrug
                  .privateDrugId,
            },
            data,
            select: {
              privateDrugId: true,
              drugId: true,
              dosageFormId: true,
              tradeName: true,
              barcode: true,
              unitsPerBox: true,
              isRx: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,

              dosageForm: {
                select: {
                  dosageFormId: true,
                  dosageFormName: true,
                  formCategory: true,
                },
              },
            },
          });
        

        let updatedPharmacyDrug=null;
         const pharmacyDrugDto:
            UpdatePharmacyDrugDto = {};

        if(dto.isActive!==undefined){
          pharmacyDrugDto.isActive=dto.isActive;
        }
        if(dto.minStockAlert!==undefined){
          pharmacyDrugDto.minStockAlert=dto.minStockAlert;
        }
        if(dto.sellPart!==undefined){
          pharmacyDrugDto.sellPart=dto.sellPart;
        }
        if(dto.consumerPrice!==undefined){
          pharmacyDrugDto.consumerPrice=dto.consumerPrice;
        }
        if(dto.expiryDateAlarm!==undefined){
          pharmacyDrugDto.expiryDateAlarm=dto.expiryDateAlarm;
        }
        if(dto.notes!==undefined){
          pharmacyDrugDto.notes=dto.notes;
        }
        updatedPharmacyDrug =
            await this.updatePharmacyDrugUseCase
              .executeWithTx(
                tx,
                pharmacyId,
                pharmacyDrugId,
                pharmacyDrugDto,
              );
        
        return updatedPrivateDrug;
        // return {
        //   pharmacyDrugId:
        //     pharmacyDrug.pharmacyDrugId,

        //   drugId:
        //     pharmacyDrug.drugId,

        //   privateDrug:
        //     updatedPrivateDrug,
        // };
      },
    );
  }
}