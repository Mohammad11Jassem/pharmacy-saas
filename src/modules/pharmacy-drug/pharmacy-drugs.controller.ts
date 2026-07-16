import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PharmacyDrugService } from './pharmacy-drug.service';
import { ActiveUser } from '../../iam/decorators/active-user.decorator';
import { AddGeneralDrugDto } from './dto/add-general-drug.dto';
import { ListPharmacyDrugsDto } from './dto/list-pharmacy-drugs.dto';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { AccountType } from '../../generated/prisma/enums';
import { UpdatePharmacyDrugDto } from './dto/update-pharmacy-drug.dto';
import { AddPrivateDrugDto } from './dto/add-private-drug.dto';
import { UpdatePrivateDrugDto } from './dto/update-private-drug.dto';
import { CurrentPharmacy } from '../../common/decorators/current-pharmacy.decorator';
import { ListAvailableBatchesQueryDto } from './dto/list-available-batches-query.dto';
import { SearchPharmacyDrugByNameDto } from './dto/search-pharmacy-drug-by-name.dto';
import { SearchMyPharmacyDrugsByNameDto } from './dto/search-my-pharmacy-drugs-by-name.dto';
import { ListDrugAlternativesQueryDto } from './dto/list-drug-alternatives-query.dto';
import { SearchPharmacyDrugsByIngredientsDto } from './dto/search-pharmacy-drugs-by-ingredients.dto';
@Roles(AccountType.PHARMACY)
@Controller('pharmacy-drugs')
export class PharmacyDrugsController {
  constructor(private readonly pharmacyDrugService: PharmacyDrugService) {}

  @Post('from-general')
  addGeneralDrug(
    @Body() dto: AddGeneralDrugDto,
    @ActiveUser('sub') pharmacyId: number,
  ) {
    return this.pharmacyDrugService.addGeneralDrug(pharmacyId, dto);
  }

  @Post('add-private-drug')
  addPrivateDrug(
    @Body() dto: AddPrivateDrugDto,
    @ActiveUser('sub') pharmacyId: number,
  ) {
    return this.pharmacyDrugService.addPrivateDrug(pharmacyId, dto);
  }
  @Get('get-all-pharmacy-drugs')
  listPharmacyDrugs(
    @ActiveUser('sub') pharmacyId: number,
    @Query() dto: ListPharmacyDrugsDto,
  ) {
    return this.pharmacyDrugService.listPharmacyDrugs(pharmacyId, dto);
  }

  @Post('update-drug/:pharmacyDrugId')
  updatePharmacyDrug(
    @ActiveUser('sub') pharmacyId: number,
    @Param('pharmacyDrugId', ParseIntPipe)
    pharmacyDrugId: number,
    @Body() dto: UpdatePharmacyDrugDto,
  ) {
    return this.pharmacyDrugService.updatePharmacyDrug(
      pharmacyId,
      pharmacyDrugId,
      dto,
    );
  }

  @Post('update-private-drug/:pharmacyDrugId')
  updatePrivateDrug(
    @ActiveUser('sub') pharmacyId: number,
    @Param('pharmacyDrugId', ParseIntPipe)
    pharmacyDrugId: number,
    @Body() dto: UpdatePrivateDrugDto,
  ) {
    return this.pharmacyDrugService.updatePrivateDrug(
      pharmacyId,
      pharmacyDrugId,
      dto,
    );
  }

  @Roles(AccountType.PHARMACY)
  @Get('drug-details/:pharmacyDrugId')
  getPharmacyDrugDetails(
    @ActiveUser('sub') pharmacyId: number,
    @Param('pharmacyDrugId', ParseIntPipe)
    pharmacyDrugId: number,
  ) {
    return this.pharmacyDrugService.getPharmacyDrugDetails(
      pharmacyId,
      pharmacyDrugId,
    );
  }

  @Get('get-my-drug-by-barcode/:barcode')
  findPharmacyDrugByBarcode(
    @ActiveUser('sub') pharmacyId: number,
    @Param('barcode') barcode: string,
  ) {
    return this.pharmacyDrugService.findPharmacyDrugByBarcode(
      pharmacyId,
      barcode,
    );
  }

  @Get(':pharmacyDrugId/sale-units')
  getPharmacyDrugSaleUnits(
    @ActiveUser('sub') pharmacyId: number,
    @Param('pharmacyDrugId', ParseIntPipe)
    pharmacyDrugId: number,
  ) {
    return this.pharmacyDrugService.getPharmacyDrugSaleUnits(
      pharmacyId,
      pharmacyDrugId,
    );
  }

  @Get(':pharmacyDrugId/available-batches')
  findAvailableBatches(
    @CurrentPharmacy() pharmacyId: number,
    @Param('pharmacyDrugId', ParseIntPipe) pharmacyDrugId: number,
    @Query() query: ListAvailableBatchesQueryDto,
  ) {
    return this.pharmacyDrugService.findAvailableBatches(
      pharmacyId,
      pharmacyDrugId,
      query,
    );
  }

  @Get('search-in-stock-and-cdb/by-barcode/:barcode')
  searchPharmacyDrugsByBarcode(
    @ActiveUser('sub') pharmacyId: number,
    @Param('barcode') barcode: string,
  ) {
    return this.pharmacyDrugService.searchPharmacyDrugsByBarcode(
      pharmacyId,
      barcode,
    );
  }

  @Get('search-in-stock-and-cdb/by-name')
  searchPharmacyDrugsByName(
    @ActiveUser('sub') pharmacyId: number,
    @Query() dto: SearchPharmacyDrugByNameDto,
  ) {
    return this.pharmacyDrugService.searchPharmacyDrugsByName(pharmacyId, dto);
  }

  @Get('search-my-drugs/by-name')
  searchMyPharmacyDrugsByName(
    @ActiveUser('sub') pharmacyId: number,
    @Query() dto: SearchMyPharmacyDrugsByNameDto,
  ) {
    return this.pharmacyDrugService.searchMyPharmacyDrugsByName(
      pharmacyId,
      dto,
    );
  }

  @Get(':pharmacyDrugId/alternatives')
  getPharmacyDrugAlternatives(
    @ActiveUser('sub') pharmacyId: number,
    @Param('pharmacyDrugId', ParseIntPipe)
    pharmacyDrugId: number,
    @Query() query: ListDrugAlternativesQueryDto,
  ) {
    return this.pharmacyDrugService.getPharmacyDrugAlternatives(
      pharmacyId,
      pharmacyDrugId,
      query,
    );
  }


  @Post('search-by-ingredients')
  searchPharmacyDrugsByIngredients(
    @ActiveUser('sub') pharmacyId: number,
    @Body() dto: SearchPharmacyDrugsByIngredientsDto,
  ) {
    return this.pharmacyDrugService.searchPharmacyDrugsByIngredients(
      pharmacyId,
      dto,
    );
  }
}
