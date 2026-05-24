import { ConflictException, Injectable } from '@nestjs/common';
import { CreatePharmacyCredentialDto } from './dto/create-pharmacy-credential.dto';
import { UpdatePharmacyCredentialDto } from './dto/update-pharmacy-credential.dto';
import { TransactionClient } from '../../generated/prisma/internal/prismaNamespace';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeType } from '../../common/Enums/code-type.enum';
import { CodeGenerationService } from '../../common/code-generation/code-generation.service';

@Injectable()
export class PharmacyCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly codeGenerationService: CodeGenerationService,
  ) {}
  create(createPharmacyCredentialDto: CreatePharmacyCredentialDto) {
    return 'This action adds a new pharmacyCredential';
  }

  findAll() {
    return `This action returns all pharmacyCredentials`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pharmacyCredential`;
  }

  update(id: number, updatePharmacyCredentialDto: UpdatePharmacyCredentialDto) {
    return `This action updates a #${id} pharmacyCredential`;
  }

  remove(id: number) {
    return `This action removes a #${id} pharmacyCredential`;
  }

  async createForPharmacyAccount(tx: TransactionClient, pharmacyId: number) {
    const existingCredential = await tx.pharmacyCredential.findUnique({
      where: {
        pharmacyId,
      },
    });

    if (existingCredential) {
      throw new ConflictException(
        'This pharmacy already has a credential record.',
      );
    }

    const loginCode = await this.generateUniquePharmacyLoginCode(tx);

    return tx.pharmacyCredential.create({
      data: {
        pharmacyId,
        loginCode,

        // كلمة المرور تبقى null في البداية.
        // لاحقاً عند تفعيل حساب الصيدلية، يتم تعيين passwordHash الحقيقي.
        passwordHash: null,

        lockedUntil: null,
        activatedAt: null,
      },
    });
  }

  private async generateUniquePharmacyLoginCode(
    tx: TransactionClient | PrismaService,
  ): Promise<string> {
    while (true) {
      const code = this.codeGenerationService.generate({
        length: 8,
        type: CodeType.ALPHANUMERIC,
        prefix: 'PH',
      });

      const existingCredential = await tx.pharmacyCredential.findUnique({
        where: {
          loginCode: code,
        },
      });

      if (!existingCredential) {
        return code;
      }
    }
  }
}
