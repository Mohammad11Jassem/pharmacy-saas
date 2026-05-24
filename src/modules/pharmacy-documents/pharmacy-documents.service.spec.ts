import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyDocumentsService } from './pharmacy-documents.service';

describe('PharmacyDocumentsService', () => {
  let service: PharmacyDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PharmacyDocumentsService],
    }).compile();

    service = module.get<PharmacyDocumentsService>(PharmacyDocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
