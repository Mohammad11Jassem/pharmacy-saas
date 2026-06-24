import { Injectable } from '@nestjs/common';
import { CreateReturnInvoiceDto } from './dto/create-return-invoice.dto';
import { UpdateReturnInvoiceDto } from './dto/update-return-invoice.dto';
import { CreateReturnInvoiceUseCase } from './use-cases/create-return-invoice.usecase';
import { FindReturnInvoicesBySaleUseCase } from './use-cases/find-return-invoices-by-sale.usecase';
import { GetReturnInvoicesBySaleDto } from './dto/get-return-invoices-by-sale.dto';
import { FindReturnInvoiceDetailsUseCase } from './use-cases/find-return-invoice-details.usecase';

@Injectable()
export class ReturnInvoiceService {
  constructor(
    private readonly createReturnInvoiceUseCase: CreateReturnInvoiceUseCase,
    private readonly findReturnInvoicesBySaleUseCase: FindReturnInvoicesBySaleUseCase,
    private readonly findReturnInvoiceDetailsUseCase: FindReturnInvoiceDetailsUseCase,
  ) {}

  create(pharmacyId: number, dto: CreateReturnInvoiceDto) {
    return this.createReturnInvoiceUseCase.execute(pharmacyId, dto);
  }
  findBySaleInvoice(
    pharmacyId: number,
    saleInvoiceId: number,
    query: GetReturnInvoicesBySaleDto,
  ) {
    return this.findReturnInvoicesBySaleUseCase.execute(
      pharmacyId,
      saleInvoiceId,
      query,
    );
  }

  findOne(pharmacyId: number, returnInvoiceId: number) {
    return this.findReturnInvoiceDetailsUseCase.execute(
      pharmacyId,
      returnInvoiceId,
    );
  }
}
