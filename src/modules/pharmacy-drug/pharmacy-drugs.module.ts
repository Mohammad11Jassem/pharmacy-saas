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

@Module({
  controllers: [
    PharmacyDrugsController,
  ],

  providers: [
    PharmacyDrugService,
    UnitOfWork,
    AddGeneralDrugUseCase,
    AddPrivateDrugUseCase,
    ListPharmacyDrugsUseCase,
    UpdatePharmacyDrugUseCase,
    GetPharmacyDrugDetailsUseCase,
    UpdatePrivateDrugUseCase,

  ],
})
export class PharmacyDrugsModule {}