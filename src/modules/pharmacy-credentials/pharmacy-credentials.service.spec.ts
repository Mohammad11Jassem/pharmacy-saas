import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyCredentialsService } from './pharmacy-credentials.service';

describe('PharmacyCredentialsService', () => {
  let service: PharmacyCredentialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PharmacyCredentialsService],
    }).compile();

    service = module.get<PharmacyCredentialsService>(PharmacyCredentialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
