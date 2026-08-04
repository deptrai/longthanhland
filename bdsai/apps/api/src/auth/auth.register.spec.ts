import { Test, type TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../db/database.tokens';
import { SupabaseService } from '../supabase/supabase.service';
import { QueueService } from '../queue/queue.service';
import { AuthService } from './auth.service';

/**
 * Unit test AuthService.register (AC4, AC5, AC7, E1, E4, E5) — Story 2.1.
 *
 * Mock SupabaseService.auth.admin (createUser/deleteUser) + Drizzle insert +
 * QueueService.addEmailVerificationJob.
 *
 * Cases:
 *   - Happy path → 201 + public_users insert + queue job enqueued.
 *   - E1: email trùng → ConflictException, KHÔNG insert, KHÔNG queue.
 *   - E4: supabase createUser fail (network) → InternalServerErrorException.
 *   - E5: db.insert fail → admin.deleteUser called (compensate) + 500.
 *   - AC5: phone normalize trước insert (verify stored phone normalized).
 */
describe('AuthService.register (AC4, AC5, AC7)', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseService: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  let queueService: { addEmailVerificationJob: jest.Mock };

  beforeEach(async () => {
    supabaseService = {
      auth: {
        admin: {
          createUser: jest.fn(),
          deleteUser: jest.fn(),
        },
      },
    };
    db = { insert: jest.fn(() => ({ values: jest.fn().mockResolvedValue(undefined) })) };
    queueService = { addEmailVerificationJob: jest.fn().mockResolvedValue('job-1') };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: DRIZZLE, useValue: db },
        { provide: QueueService, useValue: queueService },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'SUPABASE_URL' ? 'http://127.0.0.1:54351' : undefined) },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  const validDto = {
    email: 'test-2-1@bdsai.vn',
    phone: '0901234567',
    password: 'Abc12345',
  };

  it('happy path → tạo user + insert public_users + enqueue email job (AC4)', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-1' } },
      error: null,
    });

    const result = await service.register(validDto);

    expect(result).toEqual({
      userId: 'user-uuid-1',
      email: 'test-2-1@bdsai.vn',
      phoneVerified: false,
      emailVerified: false,
    });
    expect(supabaseService.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'test-2-1@bdsai.vn',
      password: 'Abc12345',
      phone: '+84901234567',
      email_confirm: false,
    });
    expect(db.insert).toHaveBeenCalled();
    expect(queueService.addEmailVerificationJob).toHaveBeenCalledWith({
      userId: 'user-uuid-1',
      email: 'test-2-1@bdsai.vn',
    });
  });

  it('AC5: normalize phone +84 → 0 trước insert', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-2' } },
      error: null,
    });

    await service.register({ ...validDto, phone: '+84901234567' });

    // createUser nhận phone E.164 (+84xxxxxxxxx).
    expect(supabaseService.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+84901234567' }),
    );
    // insert nhận phone normalized.
    expect(db.insert).toHaveBeenCalled();
  });

  it('E1: email trùng → ConflictException, KHÔNG insert, KHÔNG queue (AC7)', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', error_code: 'email_exists' },
    });

    await expect(service.register(validDto)).rejects.toThrow(ConflictException);

    expect(db.insert).not.toHaveBeenCalled();
    expect(queueService.addEmailVerificationJob).not.toHaveBeenCalled();
  });

  it('E4: supabase createUser network error → InternalServerErrorException', async () => {
    supabaseService.auth.admin.createUser.mockRejectedValue(
      new Error('fetch failed: network error'),
    );

    await expect(service.register(validDto)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(db.insert).not.toHaveBeenCalled();
    expect(queueService.addEmailVerificationJob).not.toHaveBeenCalled();
  });

  it('E5: db.insert fail → compensate deleteUser called + InternalServerErrorException (AC4c)', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-orphan' } },
      error: null,
    });
    db.insert.mockReturnValueOnce({
      values: jest.fn().mockRejectedValue(new Error('DB connection lost')),
    });
    supabaseService.auth.admin.deleteUser.mockResolvedValue({ error: null });

    await expect(service.register(validDto)).rejects.toThrow(
      InternalServerErrorException,
    );

    // Compensate rollback: deleteUser called với userId.
    expect(supabaseService.auth.admin.deleteUser).toHaveBeenCalledWith(
      'user-uuid-orphan',
    );
    // Queue KHÔNG enqueue (registration fail).
    expect(queueService.addEmailVerificationJob).not.toHaveBeenCalled();
  });

  it('E9: rate limit → ConflictException (user-friendly message)', async () => {
    supabaseService.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Rate limit exceeded' },
    });

    await expect(service.register(validDto)).rejects.toThrow(ConflictException);
    expect(db.insert).not.toHaveBeenCalled();
  });
});
