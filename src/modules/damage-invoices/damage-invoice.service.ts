import { Injectable } from '@nestjs/common';
import { CreateDamageInvoiceUseCase } from './use-cases/create-damage-invoice.usecase';
import { ListDamageInvoicesUseCase } from './use-cases/list-damage-invoices.usecase';
import { GetDamageInvoiceUseCase } from './use-cases/damage-invoice-by-id.usecase';
import { UpdateDamageInvoiceItemUseCase } from './use-cases/update-damge-invoice-item.usecase';
import { AddDamageInvoiceItemUseCase } from './use-cases/add-damge-invoice-item.usecase';
import { CreateDamageInvoiceDto } from './dto/create-damage-invoice.dto';
import { UpdateDamageInvoiceDto } from './dto/update-damage-invoice.dto';
import { CreateDamageInvoiceItemDto } from './dto/create-damage-invoice-item.dto';
import { UpdateDamageInvoiceItemDto } from './dto/update-damage-invoice-item.dto';
import { CreateSingleDrugDamageInvoiceUseCase } from './use-cases/create-single-drug-damage-invoice.usecase';
import { CreateSingleDrugDamageInvoiceDto } from './dto/create-single-drug-damage-invoice.dto';
import { ListDamageInvoicesDto } from './dto/list-damage-invoices.dto';

@Injectable()
export class DamageInvoiceService {
  constructor(
    private readonly createDamageInvoiceUseCase: CreateDamageInvoiceUseCase,
    private readonly listDamageInvoicesUseCase: ListDamageInvoicesUseCase,
    private readonly getDamageInvoiceUseCase: GetDamageInvoiceUseCase,
    private readonly updateDamageInvoiceUseCase: UpdateDamageInvoiceItemUseCase,
    // private readonly cancelDamageInvoiceUseCase: CancelDamageInvoiceUseCase,
    private readonly addDamageInvoiceItemUseCase: AddDamageInvoiceItemUseCase,
    // private readonly updateDamageInvoiceItemUseCase: UpdateDamageInvoiceItemUseCase,
    // private readonly deleteDamageInvoiceItemUseCase: DeleteDamageInvoiceItemUseCase,
    private readonly createSingleDrugDamageInvoiceUseCase: CreateSingleDrugDamageInvoiceUseCase,
  ) {}

  create(pharmacyId: number, dto: CreateDamageInvoiceDto) {
    return this.createDamageInvoiceUseCase.execute(pharmacyId, dto);
  }

  list(pharmacyId: number, dto: ListDamageInvoicesDto) {
    return this.listDamageInvoicesUseCase.execute(pharmacyId, dto);
  }

  getOne(pharmacyId: number, damageInvoiceId: number) {
    return this.getDamageInvoiceUseCase.execute(pharmacyId, damageInvoiceId);
  }

  updateDamageInvoiceItem(
    pharmacyId: number,
    damageInvoiceId: number,
    itemId: number,
    dto: UpdateDamageInvoiceItemDto,
  ) {
    return this.updateDamageInvoiceUseCase.execute(
      pharmacyId,
      damageInvoiceId,
      itemId,
      dto,
    );
  }

  //   cancel(
  //     pharmacyId: number,
  //     damageInvoiceId: number,
  //   ) {
  //     return this.cancelDamageInvoiceUseCase.execute(
  //       pharmacyId,
  //       damageInvoiceId,
  //     );
  //   }

  addItem(
    pharmacyId: number,
    damageInvoiceId: number,
    dto: CreateDamageInvoiceItemDto,
  ) {
    return this.addDamageInvoiceItemUseCase.execute(
      pharmacyId,
      damageInvoiceId,
      dto,
    );
  }

  //   updateItem(
  //     pharmacyId: number,
  //     damageInvoiceId: number,
  //     itemId: number,
  //     dto: UpdateDamageInvoiceItemDto,
  //   ) {
  //     return this.updateDamageInvoiceItemUseCase.execute(
  //       pharmacyId,
  //       damageInvoiceId,
  //       itemId,
  //       dto,
  //     );
  //   }

  //   deleteItem(
  //     pharmacyId: number,
  //     damageInvoiceId: number,
  //     itemId: number,
  //   ) {
  //     return this.deleteDamageInvoiceItemUseCase.execute(
  //       pharmacyId,
  //       damageInvoiceId,
  //       itemId,
  //     );
  //   }

  createSingleDrugDamageInvoice(
    pharmacyId: number,
    dto: CreateSingleDrugDamageInvoiceDto,
  ) {
    return this.createSingleDrugDamageInvoiceUseCase.execute(pharmacyId, dto);
  }
}
