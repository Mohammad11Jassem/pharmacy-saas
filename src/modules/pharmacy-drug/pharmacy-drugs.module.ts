import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { PharmacyDrugService } from './pharmacy-drug.service';
import { PharmacyDrugsController } from './pharmacy-drugs.controller';
import { AddGeneralDrugUseCase } from './use-cases/add-general-drug.usecase';
import { AddPrivateDrugUseCase } from './use-cases/add-private-drug.usecase';
import { ListPharmacyDrugsUseCase } from './use-cases/list-pharmacy-drugs.usecase';
import { UpdatePharmacyDrugUseCase } from './use-cases/update-pharmacy-drug.usecase';
import { GetPharmacyDrugDetailsUseCase } from './use-cases/get-pharmacy-drug-details.usecase';
import { UpdatePrivateDrugUseCase } from './use-cases/update-private-drug.usecase';
import { GetPharmacyDrugSaleUnitsUseCase } from './use-cases/get-pharmacy-drug-sale-units.usecase';
import { ListAvailableBatchesUseCase } from './use-cases/list-available-batches.usecase';
import { FindPharmacyDrugByBarcodeUseCase } from './use-cases/find-pharmacy-drug-by-barcode.usecase';

@Module({
  controllers: [PharmacyDrugsController],

  providers: [
    PharmacyDrugService,
    UnitOfWork,
    AddGeneralDrugUseCase,
    AddPrivateDrugUseCase,
    ListPharmacyDrugsUseCase,
    UpdatePharmacyDrugUseCase,
    GetPharmacyDrugDetailsUseCase,
    UpdatePrivateDrugUseCase,
    GetPharmacyDrugSaleUnitsUseCase,
    ListAvailableBatchesUseCase,
    FindPharmacyDrugByBarcodeUseCase,
  ],
})
export class PharmacyDrugsModule {}
