import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  it('GET / trả health ok + service name + defaultRole user', () => {
    const result = appController.getHealth();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('bdsai-api');
    expect(result.defaultRole).toBe('user');
  });
});
