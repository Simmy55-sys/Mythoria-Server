import { Test, TestingModule } from '@nestjs/testing';
import { FileReaderService } from './file-reader.service';

describe('FileReaderService', () => {
  let service: FileReaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileReaderService],
    }).compile();

    service = module.get<FileReaderService>(FileReaderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
