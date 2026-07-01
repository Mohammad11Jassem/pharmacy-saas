import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DamageInvoiceController } from './damage-invoice.controller';
import { DamageInvoiceService } from './damage-invoice.service';
import { UnitOfWork } from '../../common/TransactionWrapper/unit-of-work';
import { CreateDamageInvoiceUseCase } from './use-cases/create-damage-invoice.usecase';
import { CreateSingleDrugDamageInvoiceUseCase } from './use-cases/create-single-drug-damage-invoice.usecase';
import { ListDamageInvoicesUseCase } from './use-cases/list-damage-invoices.usecase';
import { GetDamageInvoiceUseCase } from './use-cases/damage-invoice-by-id.usecase';
import { UpdateDamageInvoiceItemUseCase } from './use-cases/update-damge-invoice-item.usecase';
import { AddDamageInvoiceItemUseCase } from './use-cases/add-damge-invoice-item.usecase';


@Module({
  controllers: [DamageInvoiceController],
  providers: [
    DamageInvoiceService,
    UnitOfWork,

    CreateDamageInvoiceUseCase,
    CreateSingleDrugDamageInvoiceUseCase,
    ListDamageInvoicesUseCase,
    GetDamageInvoiceUseCase,
    UpdateDamageInvoiceItemUseCase,
    AddDamageInvoiceItemUseCase,
  ],
})
export class DamageInvoiceModule {}