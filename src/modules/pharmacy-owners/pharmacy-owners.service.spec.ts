import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyOwnersService } from './pharmacy-owners.service';

describe('PharmacyOwnersService', () => {
  let service: PharmacyOwnersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PharmacyOwnersService],
    }).compile();

    service = module.get<PharmacyOwnersService>(PharmacyOwnersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
