import { Injectable } from '@nestjs/common';
import { AddGeneralDrugUseCase } from './use-cases/add-general-drug.usecase';
import { AddGeneralDrugDto } from './dto/add-general-drug.dto';
import { AddPrivateDrugDto } from './dto/add-private-drug.dto';
import { AddPrivateDrugUseCase } from './use-cases/add-private-drug.usecase';
import { ListPharmacyDrugsDto } from './dto/list-pharmacy-drugs.dto';
import { ListPharmacyDrugsUseCase } from './use-cases/list-pharmacy-drugs.usecase';
import { UpdatePharmacyDrugDto } from './dto/update-pharmacy-drug.dto';
import { UpdatePharmacyDrugUseCase } from './use-cases/update-pharmacy-drug.usecase';
import { GetPharmacyDrugDetailsUseCase } from './use-cases/get-pharmacy-drug-details.usecase';
import { UpdatePrivateDrugUseCase } from './use-cases/update-private-drug.usecase';
import { UpdatePrivateDrugDto } from './dto/update-private-drug.dto';
import { GetPharmacyDrugSaleUnitsUseCase } from './use-cases/get-pharmacy-drug-sale-units.usecase';
import { ListAvailableBatchesQueryDto } from './dto/list-available-batches-query.dto';
import { ListAvailableBatchesUseCase } from './use-cases/list-available-batches.usecase';
import { FindPharmacyDrugByBarcodeUseCase } from './use-cases/find-pharmacy-drug-by-barcode.usecase';
import { SearchPharmacyDrugByNameDto } from './dto/search-pharmacy-drug-by-name.dto';
import { SearchPharmacyDrugsByBarcodeUseCase } from './use-cases/search-pharmacy-drugs-by-barcode.usecase';
import { SearchPharmacyDrugsByNameUseCase } from './use-cases/search-pharmacy-drugs-by-name.usecase';
import { SearchMyPharmacyDrugsByNameUseCase } from './use-cases/search-my-pharmacy-drugs-by-name.usecase';
import { SearchMyPharmacyDrugsByNameDto } from './dto/search-my-pharmacy-drugs-by-name.dto';

@Injectable()
export class PharmacyDrugService {
  constructor(
    private readonly addGeneralDrugUseCase: AddGeneralDrugUseCase,

    private readonly addPrivateDrugUseCase: AddPrivateDrugUseCase,

    private readonly listPharmacyDrugsUseCase: ListPharmacyDrugsUseCase,

    private readonly updatePharmacyDrugUseCase: UpdatePharmacyDrugUseCase,

    private readonly getPharmacyDrugDetailsUseCase: GetPharmacyDrugDetailsUseCase,

    private readonly updatePrivateDrugUseCase: UpdatePrivateDrugUseCase,

    private readonly getPharmacyDrugSaleUnitsUseCase: GetPharmacyDrugSaleUnitsUseCase,

    private readonly listAvailableBatchesUseCase: ListAvailableBatchesUseCase,

    private readonly findPharmacyDrugByBarcodeUseCase: FindPharmacyDrugByBarcodeUseCase,

    private readonly searchPharmacyDrugsByBarcodeUseCase: SearchPharmacyDrugsByBarcodeUseCase,

    private readonly searchPharmacyDrugsByNameUseCase: SearchPharmacyDrugsByNameUseCase,
    private readonly searchMyPharmacyDrugsByNameUseCase: SearchMyPharmacyDrugsByNameUseCase,
  ) {}

  addGeneralDrug(pharmacyId: number, dto: AddGeneralDrugDto) {
    return this.addGeneralDrugUseCase.execute(pharmacyId, dto);
  }

  addPrivateDrug(pharmacyId: number, dto: AddPrivateDrugDto) {
    return this.addPrivateDrugUseCase.execute(pharmacyId, dto);
  }

  listPharmacyDrugs(pharmacyId: number, dto: ListPharmacyDrugsDto) {
    return this.listPharmacyDrugsUseCase.execute(pharmacyId, dto);
  }

  updatePharmacyDrug(
    pharmacyId: number,
    pharmacyDrugId: number,
    dto: UpdatePharmacyDrugDto,
  ) {
    return this.updatePharmacyDrugUseCase.execute(
      pharmacyId,
      pharmacyDrugId,
      dto,
    );
  }

  updatePrivateDrug(
    pharmacyId: number,
    pharmacyDrugId: number,
    dto: UpdatePrivateDrugDto,
  ) {
    return this.updatePrivateDrugUseCase.execute(
      pharmacyId,
      pharmacyDrugId,
      dto,
    );
  }
  getPharmacyDrugDetails(pharmacyId: number, pharmacyDrugId: number) {
    return this.getPharmacyDrugDetailsUseCase.execute(
      pharmacyId,
      pharmacyDrugId,
    );
  }
  getPharmacyDrugSaleUnits(pharmacyId: number, pharmacyDrugId: number) {
    return this.getPharmacyDrugSaleUnitsUseCase.execute(
      pharmacyId,
      pharmacyDrugId,
    );
  }
  findAvailableBatches(
    pharmacyId: number,
    pharmacyDrugId: number,
    query: ListAvailableBatchesQueryDto,
  ) {
    return this.listAvailableBatchesUseCase.execute(
      pharmacyId,
      pharmacyDrugId,
      query,
    );
  }

  findPharmacyDrugByBarcode(pharmacyId: number, barcode: string) {
    return this.findPharmacyDrugByBarcodeUseCase.execute(pharmacyId, barcode);
  }

  searchPharmacyDrugsByBarcode(pharmacyId: number, barcode: string) {
    return this.searchPharmacyDrugsByBarcodeUseCase.execute(
      pharmacyId,
      barcode,
    );
  }

  searchPharmacyDrugsByName(
    pharmacyId: number,
    dto: SearchPharmacyDrugByNameDto,
  ) {
    return this.searchPharmacyDrugsByNameUseCase.execute(pharmacyId, dto);
  }

  searchMyPharmacyDrugsByName(
    pharmacyId: number,
    dto: SearchMyPharmacyDrugsByNameDto,
  ) {
    return this.searchMyPharmacyDrugsByNameUseCase.execute(pharmacyId, dto);
  }
}
