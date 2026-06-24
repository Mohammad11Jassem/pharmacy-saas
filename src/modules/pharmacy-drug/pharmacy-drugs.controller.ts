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
}
