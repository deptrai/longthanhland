import { z } from 'zod';

/**
 * Create listing DTO (AC1) — Story 3.1.
 *
 * Seller tạo listing DRAFT. Validate field bắt buộc.
 * Images: Story 3.2 sẽ implement upload; Story 3.1 chấp nhận array URL.
 */
export const createListingSchema = z.object({
  listingType: z.enum(['sell', 'rent']).default('sell'),
  title: z.string().min(5, 'Tiêu đề tối thiểu 5 ký tự').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự').max(5000, 'Mô tả tối đa 5000 ký tự'),
  price: z.number().int().positive('Giá phải lớn hơn 0').max(10_000_000_000_000, 'Giá quá lớn'),
  area: z.number().positive('Diện tích phải lớn hơn 0').max(1_000_000, 'Diện tích quá lớn'),
  propertyType: z.enum(['land', 'house', 'apartment', 'commercial', 'project']),
  province: z.string().min(1, 'Tỉnh/thành phố bắt buộc'),
  district: z.string().min(1, 'Quận/huyện bắt buộc'),
  ward: z.string().optional(),
  street: z.string().optional(),
  address: z.string().min(1, 'Địa chỉ bắt buộc'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  floorCount: z.number().int().min(0).max(100).optional(),
  legalStatus: z.string().max(100).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        isCover: z.boolean(),
      }),
    )
    .max(10, 'Tối đa 10 ảnh')
    .default([]),
});
export type CreateListingDto = z.infer<typeof createListingSchema>;

/**
 * Update listing DTO — partial update (PATCH).
 * Chỉ cho phép khi status ∈ {DRAFT, PENDING, REJECTED}.
 */
export const updateListingSchema = createListingSchema.partial().omit({ listingType: true });
export type UpdateListingDto = z.infer<typeof updateListingSchema>;

/**
 * Submit listing — DRAFT → PENDING (AC4 workflow).
 * Body rỗng — chỉ chuyển status.
 */
export const submitListingSchema = z.object({}).optional();
