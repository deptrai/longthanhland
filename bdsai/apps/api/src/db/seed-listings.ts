// Story 3.7 — Seed 50+ listing mẫu khu vực Long Thành/Đồng Nai.
// Idempotent: dùng deterministic UUIDs để chạy lại không trùng.
// Chạy: npx tsx src/db/seed-listings.ts
// AD-8: KHÔNG chứa PII thật — dữ liệu giả/ẩn danh.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

const SEED_SELLER_EMAIL = 'seed-seller@bdsai.vn';

const PROVINCES = ['Đồng Nai', 'Bà Rịa - Vũng Tàu', 'TP. Hồ Chí Minh'];
const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  'Đồng Nai': ['Long Thành', 'Nhơn Trạch', 'Trảng Bom', 'Biên Hòa'],
  'Bà Rịa - Vũng Tàu': ['Đất Đỏ', 'Long Điền', 'Phú Mỹ'],
  'TP. Hồ Chí Minh': ['Quận 9', 'Quận 2', 'Huyện Cần Giờ'],
};
const PROPERTY_TYPES = ['land', 'house', 'apartment', 'commercial'];
const LISTING_TYPES = ['sell', 'rent'];
const LEGAL_STATUSES = ['so_do', 'so_hong', 'giay_to_khac'];

const TITLES = [
  'Đất nền sổ đỏ khu đô thị Long Thành',
  'Bán đất mặt tiền QL51 Long Thành',
  'Đất thổ cư gần sân bay Long Thành',
  'Bán nhà vườn Long Thành diện tích lớn',
  'Đất nền dự án Long Thành giá tốt',
  'Bán đất gần sân bay quốc tế Long Thành',
  'Đất nền Biên Hòa sổ hồng riêng',
  'Bán nhà phố Nhơn Trạch Đồng Nai',
  'Đất nền KDC Long Thành 100m2',
  'Bán đất Trảng Bom Đồng Nai',
  'Căn hộ chung cư Biên Hòa 2 phòng ngủ',
  'Đất thương mại mặt tiền QL1A',
  'Bán đất nền dự án Phú Mỹ BRVT',
  'Nhà phố Đất Đỏ BRVT gần biển',
  'Đất nền khu công nghiệp Phú Mỹ',
  'Bán đất Long Điền BRVT view biển',
  'Căn hộ Quận 9 TP.HCM gần Metro',
  'Đất nền khu dân cư Cần Giờ',
  'Bán đất nền sổ đỏ Long Thành 150m2',
  'Nhà vườn Biên Hòa 500m2 có hồ cá',
  'Đất nền dự án mới Long Thành 2024',
  'Bán đất mặt tiền đường lớn Long Thành',
  'Đất thổ cư 100% Nhơn Trạch Đồng Nai',
  'Bán nhà cấp 4 Long Thành sổ hồng',
  'Đất nền KDC mới Trảng Bom',
  'Căn hộ cao cấp Biên Hòa nội thất đầy đủ',
  'Bán đất dự án sân bay Long Thành giá rẻ',
  'Đất nền liền kề khu công nghệ cao',
  'Bán đất 200m2 Long Thành gần cao tốc',
  'Nhà phố thương mại Biên Hòa mặt tiền',
  'Đất nền BRVT Đất Đỏ gần khu du lịch',
  'Bán đất vườn 1000m2 Long Thành',
  'Đất nền dự án Long Thành giai đoạn 2',
  'Bán đất sổ đỏ Long Thành 120m2',
  'Căn hộ 3 phòng ngủ Quận 9 view sông',
  'Đất nền KDC Nhơn Trạch 80m2',
  'Bán nhà 2 tầng Long Thành 120m2',
  'Đất nền dự án Phú Mỹ BRVT 100m2',
  'Bán đất thổ cư Trảng Bom 200m2',
  'Đất nền khu đô thị Biên Hòa mới',
  'Bán đất mặt tiền biển Long Điền BRVT',
  'Đất nền dự án KDC Cần Giờ',
  'Bán đất nền Long Thành gần trường học',
  'Đất thương mại Nhơn Trạch 300m2',
  'Bán nhà phố Biên Hòa 3 tầng thang máy',
  'Đất nền sổ hồng Long Thành 90m2',
  'Bán đất dự án sân bay QT Long Thành',
  'Đất nền KDC Trảng Bom 150m2',
  'Căn hộ chung cư Quận 2 TP.HCM',
  'Bán đất nền Long Thành giá đầu tư',
  'Đất nền dự án Biên Hòa extended',
  'Bán đất thổ cư 100% Long Thành 200m2',
  'Đất nền dự án mới Nhơn Trạch 2024',
  'Bán đất nền KDC Phú Mỹ BRVT 110m2',
  'Đất nền sổ đỏ Trảng Bom 180m2',
];

const DESCRIPTIONS = [
  'Đất nền sổ đỏ chính chủ, diện tích {area}m², vị trí đẹp gần sân bay Long Thành. Pháp lý rõ ràng, sổ hồng riêng. Khu dân cư hiện hữu, điện nước đầy đủ. Gần trường học, chợ, trạm y tế. Liên hệ xem đất trực tiếp.',
  'Bán đất mặt tiền đường lớn, diện tích {area}m², phù hợp xây nhà ở hoặc đầu tư kinh doanh. Gần khu công nghiệp, dân cư đông. Sổ đỏ sẵn sàng. Giá tốt cho khách hàng thiện chí.',
  'Đất thổ cư 100%, diện tích {area}m², khu dân cư an ninh, đường nhựa rộng 8m. Gần cao tốc TP.HCM - Long Thành - Dầu Giây. Tiềm năng tăng giá cao khi sân bay Long Thành hoàn thành.',
  'Bán nhà vườn rộng {area}m², có cây ăn trái, hồ cá, nhà cấp 4 kiên cố. Môi trường trong lành, phù hợp nghỉ dưỡng hoặc làm farm. Sổ hồng chính chủ. Cách chợ 2km.',
  'Đất nền dự án mới, diện tích {area}m², hạ tầng hoàn thiện, đường nội bộ 12m. Gần khu công nghệ cao, sân bay Long Thành. Cơ hội đầu tư tốt. Thanh toán linh hoạt.',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateListing(idx: number, sellerId: string) {
  const province = randomFrom(PROVINCES);
  const district = randomFrom(DISTRICTS_BY_PROVINCE[province] ?? ['Long Thành']);
  const propertyType = randomFrom(PROPERTY_TYPES);
  const listingType = randomFrom(LISTING_TYPES);
  const area = randomInt(60, 500);
  const title = TITLES[idx % TITLES.length] ?? `Đất nền Long Thành ${idx}`;
  const descTemplate = randomFrom(DESCRIPTIONS);
  const description = descTemplate.replace('{area}', String(area));
  const price = listingType === 'sell'
    ? randomInt(500_000_000, 2_000_000_000)
    : randomInt(5_000_000, 30_000_000);
  const street = `Đường số ${randomInt(1, 30)}`;
  const ward = `Phường ${randomInt(1, 12)}`;
  const address = `${street}, ${ward}, ${district}, ${province}`;
  const bedrooms = propertyType === 'house' || propertyType === 'apartment' ? randomInt(2, 5) : null;
  const bathrooms = bedrooms ? randomInt(1, 3) : null;
  const floorCount = propertyType === 'house' ? randomInt(1, 4) : null;
  const legalStatus = randomFrom(LEGAL_STATUSES);
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 90);
  const publishedAt = new Date(Date.now() - randomInt(1, 60) * 24 * 60 * 60 * 1000);
  const listingId = `00000000-0000-4000-8000-${String(1000 + idx).padStart(12, '0')}`;

  return {
    id: listingId,
    seller_id: sellerId,
    status: 'PUBLISHED',
    listing_type: listingType,
    title,
    description,
    price,
    area: String(area),
    property_type: propertyType,
    province,
    district,
    ward,
    street,
    address,
    bedrooms,
    bathrooms,
    floor_count: floorCount,
    legal_status: legalStatus,
    images: [{ url: 'https://placehold.co/1200x630?text=Long+Thanh+Land', isCover: true }],
    expires_at: expiry.toISOString(),
    published_at: publishedAt.toISOString(),
    search_vector: null,
  };
}

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Seed: SUPABASE_SERVICE_ROLE_KEY is required');
    process.exit(1);
  }

  console.log('Seed: Starting listing seed (Story 3.7)...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create or find seed seller.
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers.users.find((u) => u.email === SEED_SELLER_EMAIL);
  let sellerAuthId = existing?.id;

  if (!sellerAuthId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: SEED_SELLER_EMAIL,
      password: 'SeedSeller123!',
      email_confirm: true,
      user_metadata: { full_name: 'Seed Seller (Demo)' },
    });
    if (error) {
      console.error('Seed: Failed to create seed seller:', error.message);
      process.exit(1);
    }
    sellerAuthId = data.user.id;
    console.log(`Seed: Created seed seller ${sellerAuthId}`);
  } else {
    console.log(`Seed: Seed seller already exists ${sellerAuthId}`);
  }

  // 2. Upsert public_users row.
  const { error: userError } = await supabase
    .from('public_users')
    .upsert({
      id: sellerAuthId,
      email: SEED_SELLER_EMAIL,
      phone: '0900000001',
      full_name: 'Seed Seller (Demo)',
      role: 'user',
      phone_verified: true,
      banned: false,
    }, { onConflict: 'id' });

  if (userError) {
    console.error('Seed: Failed to upsert public_users:', userError.message);
  }

  // 3. Insert 55 listings (idempotent — upsert with onConflict id).
  let inserted = 0;
  let skipped = 0;
  for (let i = 0; i < 55; i++) {
    const listing = generateListing(i, sellerAuthId);
    const { data, error } = await supabase
      .from('public_listings')
      .upsert(listing, { onConflict: 'id' })
      .select();

    if (error) {
      console.error(`Seed: Failed to insert listing ${listing.id}:`, error.message);
    } else if (data && data.length > 0) {
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`Seed: Inserted/updated ${inserted} listings, skipped ${skipped}.`);
  console.log('Seed: Done.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed: Fatal error:', e);
  process.exit(1);
});
