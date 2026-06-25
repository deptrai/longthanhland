import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import sharp from 'sharp';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * UploadService (AC5, AD-7, AD-5) — Story 2.3.
 *
 * Avatar upload flow:
 *   1. Validate content-type (image) + size (≤ 10MB) — controller làm qua
 *      FileInterceptor limits + service check content-type.
 *   2. sharp convert → WebP, resize 512x512 cover center, quality 80 (AD-7).
 *   3. Supabase Storage upload (service-role — AD-5) bucket `avatars`,
 *      path `{userId}/avatar.webp`, upsert=true (1 avatar/user).
 *   4. getPublicUrl → return public URL.
 *
 * AD-2 exception: Storage upload là service riêng (KHÔNG business-entity write).
 * AD-8: KHÔNG log file content. Error generic (KHÔNG leak Supabase detail).
 */
export interface AvatarUploadResult {
  avatarUrl: string;
}

// AC5b: file size limit 10MB (AD-7 max 10MB/image).
const MAX_AVATAR_SIZE = 10 * 1024 * 1024;
// AC5b: allowed image content-types.
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
// AD-7: avatar resize 512x512 cover center, WebP quality 80.
const AVATAR_SIZE = 512;
const WEBP_QUALITY = 80;
// Bucket name — hardcode `avatars` (AD-7 — bucket riêng cho user avatar).
const AVATAR_BUCKET = 'avatars';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  async uploadAvatar(
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ): Promise<AvatarUploadResult> {
    // AC5b/E6: validate content-type (image only).
    if (!ALLOWED_CONTENT_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File phải là ảnh (JPEG, PNG, WebP, GIF)');
    }

    // AC5b/E5: validate file size (≤ 10MB). FileInterceptor limits cũng enforce
    // nhưng check lại ở service để chắc chắn (defense-in-depth).
    if (file.size > MAX_AVATAR_SIZE) {
      throw new BadRequestException('Ảnh tối đa 10MB');
    }

    // AC5c: sharp convert → WebP, resize 512x512 cover center, quality 80.
    let webpBuffer: Buffer;
    try {
      webpBuffer = await sharp(file.buffer)
        .resize(AVATAR_SIZE, AVATAR_SIZE, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (e) {
      // E15: sharp convert fail (image corrupt) → 400.
      this.logger.warn(
        { userId, action: 'uploadAvatar', reason: 'sharp-fail', err: this.safeErr(e) },
        'Sharp convert thất bại (ảnh hỏng hoặc không hợp lệ)',
      );
      throw new BadRequestException('Ảnh không hợp lệ hoặc bị hỏng');
    }

    // AC5d: upload Supabase Storage (service-role — AD-5). upsert=true (1 avatar/user).
    const path = `${userId}/avatar.webp`;
    try {
      const { error } = await this.supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, webpBuffer, {
          contentType: 'image/webp',
          upsert: true,
        });
      if (error) throw error;
    } catch (e) {
      // E7: Storage fail → 500 generic (AD-8 — không leak Supabase error detail).
      this.logger.error(
        { userId, action: 'uploadAvatar', reason: 'storage-fail', err: this.safeErr(e) },
        'Supabase Storage upload thất bại',
      );
      throw new InternalServerErrorException('Tải ảnh thất bại, thử lại sau');
    }

    // AC5e: getPublicUrl → return public URL.
    const { data: publicUrlData } = this.supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path);

    this.logger.log(
      { userId, action: 'uploadAvatar', reason: 'success' },
      'Avatar upload thành công',
    );

    return { avatarUrl: publicUrlData.publicUrl };
  }

  private safeErr(e: unknown): { name: string; message: string } {
    if (e instanceof Error) {
      return { name: e.name, message: e.message.slice(0, 300) };
    }
    const msg = typeof e === 'object' && e !== null && 'message' in e
      ? String((e as Record<string, unknown>).message)
      : String(e);
    return { name: 'Error', message: msg.slice(0, 300) };
  }
}
