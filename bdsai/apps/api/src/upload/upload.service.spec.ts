import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Unit test UploadService.uploadAvatar (AC5, E5, E6, E7, E15) — Story 2.3.
 *
 * Mock sharp (native module) + SupabaseService.storage.
 */
const sharpChain = {
  resize: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('webp-bytes')),
};
jest.mock('sharp', () => jest.fn(() => sharpChain));

import sharp from 'sharp';
import { UploadService } from './upload.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStorage = any;

describe('UploadService.uploadAvatar (AC5, E5, E6, E7, E15)', () => {
  let service: UploadService;
  let supabaseService: AnyStorage;
  const sharpMock = sharp as unknown as jest.Mock;

  beforeEach(async () => {
    sharpMock.mockClear();
    sharpChain.resize.mockClear();
    sharpChain.webp.mockClear();
    sharpChain.toBuffer.mockClear();
    sharpChain.toBuffer.mockResolvedValue(Buffer.from('webp-bytes'));
    supabaseService = {
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({ error: null }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: 'http://127.0.0.1:54351/storage/v1/object/public/avatars/u1/avatar.webp' },
          }),
        })),
      },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: SupabaseService, useValue: supabaseService },
      ],
    }).compile();

    service = moduleRef.get(UploadService);
  });

  const validFile = {
    buffer: Buffer.from('fake-image'),
    mimetype: 'image/png',
    size: 1024,
    originalname: 'test.png',
  };

  it('AC5: happy path → sharp convert + storage upload + return avatarUrl', async () => {
    const result = await service.uploadAvatar('user-uuid-1', validFile);

    expect(sharpMock).toHaveBeenCalledWith(validFile.buffer);
    expect(supabaseService.storage.from).toHaveBeenCalledWith('avatars');
    expect(result.avatarUrl).toContain('avatars/u1/avatar.webp');
  });

  it('E6: non-image content-type → 400 "File phải là ảnh"', async () => {
    await expect(
      service.uploadAvatar('user-uuid-1', {
        ...validFile,
        mimetype: 'text/plain',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.uploadAvatar('user-uuid-1', {
        ...validFile,
        mimetype: 'text/plain',
      }),
    ).rejects.toThrow('File phải là ảnh');
  });

  it('E5: file > 10MB → 400 "Ảnh tối đa 10MB"', async () => {
    await expect(
      service.uploadAvatar('user-uuid-1', {
        ...validFile,
        size: 11 * 1024 * 1024,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.uploadAvatar('user-uuid-1', {
        ...validFile,
        size: 11 * 1024 * 1024,
      }),
    ).rejects.toThrow('Ảnh tối đa 10MB');
  });

  it('E7: storage.upload fail → 500 generic "Tải ảnh thất bại"', async () => {
    supabaseService.storage.from = jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ error: { message: 'quota exceeded' } }),
      getPublicUrl: jest.fn(),
    }));

    await expect(
      service.uploadAvatar('user-uuid-1', validFile),
    ).rejects.toThrow(InternalServerErrorException);
    await expect(
      service.uploadAvatar('user-uuid-1', validFile),
    ).rejects.toThrow('Tải ảnh thất bại, thử lại sau');
  });

  it('E15: sharp convert fail (corrupt) → 400 "Ảnh không hợp lệ"', async () => {
    sharpMock.mockImplementation(() => {
      throw new Error('unsupported image format');
    });

    await expect(
      service.uploadAvatar('user-uuid-1', validFile),
    ).rejects.toThrow(BadRequestException);

    // Restore default cho test sau.
    sharpMock.mockImplementation(() => sharpChain);
  });

  it('AC5: accept image/jpeg, image/webp, image/gif', async () => {
    for (const mt of ['image/jpeg', 'image/webp', 'image/gif']) {
      const result = await service.uploadAvatar('user-uuid-1', {
        ...validFile,
        mimetype: mt,
      });
      expect(result.avatarUrl).toBeDefined();
    }
  });
});
