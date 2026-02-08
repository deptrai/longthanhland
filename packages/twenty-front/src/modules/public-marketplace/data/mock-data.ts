import type {
    Inquiry,
    PublicListing,
    PublicUser,
    RevenueStats,
    SellerStats,
    SubscriptionPlan,
    Transaction,
} from '../types';

export const mockPublicUsers: PublicUser[] = [
  {
    id: 'user-1',
    email: 'john.doe@example.com',
    phone: '+84 123 456 789',
    fullName: 'John Doe',
    subscriptionTier: 'PRO',
    subscriptionExpiry: '2026-01-15T00:00:00Z',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'jane.smith@example.com',
    phone: '+84 987 654 321',
    fullName: 'Jane Smith',
    subscriptionTier: 'FREE',
    createdAt: '2025-02-15T00:00:00Z',
  },
  {
    id: 'user-3',
    email: 'admin@example.com',
    phone: '+84 111 222 333',
    fullName: 'Admin User',
    subscriptionTier: 'ENTERPRISE',
    subscriptionExpiry: '2026-12-31T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

export const mockPublicListings: PublicListing[] = [
  {
    id: 'listing-1',
    title: 'Căn hộ 3PN Vinhomes Central Park - View sông Sài Gòn',
    description:
      'Căn hộ cao cấp 3 phòng ngủ tại Vinhomes Central Park, tầng cao view sông tuyệt đẹp. Full nội thất cao cấp, bàn giao ngay. Tiện ích đầy đủ: hồ bơi, gym, công viên, trường học quốc tế. Gần Metro, trung tâm thương mại Landmark 81.',
    price: 8500000000,
    location: 'Vinhomes Central Park, 208 Nguyễn Hữu Cảnh',
    district: 'Bình Thạnh',
    city: 'Hồ Chí Minh',
    bedrooms: 3,
    bathrooms: 2,
    area: 115,
    propertyType: 'APARTMENT',
    status: 'AVAILABLE',
    isFeatured: true,
    featuredUntil: '2026-01-31T00:00:00Z',
    trustScore: 96,
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    ],
    sellerId: 'user-1',
    sellerName: 'Nguyễn Văn Minh',
    views: 1245,
    inquiries: 28,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-27T00:00:00Z',
  },
  {
    id: 'listing-2',
    title: 'Căn hộ 2PN Masteri Thảo Điền - Giá tốt Q2',
    description:
      'Căn hộ 2 phòng ngủ tại Masteri Thảo Điền, khu Thảo Điền sầm uất. Nội thất cơ bản, view hồ bơi. Gần trường quốc tế, siêu thị, nhà hàng. Phù hợp gia đình trẻ hoặc đầu tư cho thuê.',
    price: 4200000000,
    location: 'Masteri Thảo Điền, 159 Xa Lộ Hà Nội',
    district: 'Quận 2',
    city: 'Hồ Chí Minh',
    bedrooms: 2,
    bathrooms: 2,
    area: 72,
    propertyType: 'APARTMENT',
    status: 'AVAILABLE',
    isFeatured: false,
    trustScore: 89,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    ],
    sellerId: 'user-2',
    sellerName: 'Trần Thị Hương',
    views: 876,
    inquiries: 19,
    createdAt: '2025-11-15T00:00:00Z',
    updatedAt: '2025-12-20T00:00:00Z',
  },
  {
    id: 'listing-3',
    title: 'Penthouse Duplex Gateway Thảo Điền - View toàn cảnh',
    description:
      'Penthouse duplex sang trọng tại Gateway Thảo Điền, diện tích 250m2 trên 2 tầng. Thiết kế hiện đại, full nội thất cao cấp nhập khẩu. Sân vườn riêng 80m2, hồ bơi riêng. View panorama toàn cảnh thành phố và sông Sài Gòn. Bảo vệ 24/7, tiện ích 5 sao.',
    price: 28500000000,
    location: 'Gateway Thảo Điền, 2 Xa Lộ Hà Nội',
    district: 'Quận 2',
    city: 'Hồ Chí Minh',
    bedrooms: 5,
    bathrooms: 5,
    area: 250,
    propertyType: 'APARTMENT',
    status: 'RESERVED',
    isFeatured: true,
    featuredUntil: '2026-02-28T00:00:00Z',
    trustScore: 98,
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    ],
    sellerId: 'user-1',
    sellerName: 'Nguyễn Văn Minh',
    views: 2134,
    inquiries: 47,
    createdAt: '2025-10-01T00:00:00Z',
    updatedAt: '2025-12-25T00:00:00Z',
  },
  {
    id: 'listing-4',
    title: 'Biệt thự đơn lập Phú Mỹ Hưng - Sân vườn rộng',
    description:
      'Biệt thự đơn lập cao cấp tại khu Phú Mỹ Hưng Q7, diện tích đất 300m2, xây 3 tầng. Thiết kế hiện đại, sân vườn rộng rãi, hồ bơi riêng. 5 phòng ngủ, phòng khách rộng, bếp hiện đại. Khu an ninh 24/7, gần trường quốc tế, bệnh viện, trung tâm thương mại.',
    price: 35000000000,
    location: 'Khu Phú Mỹ Hưng, Đường Nguyễn Văn Linh',
    district: 'Quận 7',
    city: 'Hồ Chí Minh',
    bedrooms: 5,
    bathrooms: 4,
    area: 300,
    propertyType: 'HOUSE',
    status: 'AVAILABLE',
    isFeatured: true,
    featuredUntil: '2026-01-31T00:00:00Z',
    trustScore: 94,
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
    ],
    sellerId: 'user-3',
    sellerName: 'Lê Hoàng Nam',
    views: 1567,
    inquiries: 35,
    createdAt: '2025-09-15T00:00:00Z',
    updatedAt: '2025-12-15T00:00:00Z',
  },
  {
    id: 'listing-5',
    title: 'Căn hộ Studio The Sun Avenue - Giá sinh viên',
    description:
      'Căn hộ studio 35m2 tại The Sun Avenue, phù hợp sinh viên hoặc người độc thân. Nội thất cơ bản, view nội khu. Gần Metro An Phú, trường đại học, khu ăn uống sầm uất. Giá thuê tốt, tiện ích đầy đủ.',
    price: 1850000000,
    location: 'The Sun Avenue, 28 Mai Chí Thọ',
    district: 'Quận 2',
    city: 'Hồ Chí Minh',
    bedrooms: 1,
    bathrooms: 1,
    area: 35,
    propertyType: 'APARTMENT',
    status: 'AVAILABLE',
    isFeatured: false,
    trustScore: 87,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    ],
    sellerId: 'user-2',
    sellerName: 'Trần Thị Hương',
    views: 543,
    inquiries: 14,
    createdAt: '2025-12-10T00:00:00Z',
    updatedAt: '2025-12-26T00:00:00Z',
  },
  {
    id: 'listing-6',
    title: 'Nhà phố 4 tầng Thảo Điền - Mặt tiền đường lớn',
    description:
      'Nhà phố 4 tầng mặt tiền đường Xuân Thủy, Thảo Điền. Diện tích 5x20m, thiết kế hiện đại. Tầng 1: Garage + phòng khách. Tầng 2-3: Phòng ngủ. Tầng 4: Sân thượng. Phù hợp kinh doanh hoặc ở. Khu an ninh, gần trường quốc tế.',
    price: 18500000000,
    location: '123 Xuân Thủy, Thảo Điền',
    district: 'Quận 2',
    city: 'Hồ Chí Minh',
    bedrooms: 4,
    bathrooms: 4,
    area: 100,
    propertyType: 'HOUSE',
    status: 'AVAILABLE',
    isFeatured: false,
    trustScore: 91,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    ],
    sellerId: 'user-3',
    sellerName: 'Lê Hoàng Nam',
    views: 987,
    inquiries: 22,
    createdAt: '2025-11-20T00:00:00Z',
    updatedAt: '2025-12-24T00:00:00Z',
  },
  {
    id: 'listing-7',
    title: 'Căn hộ 3PN Estella Heights - Nội thất Châu Âu',
    description:
      'Căn hộ 3 phòng ngủ tại Estella Heights, tầng cao view đẹp. Full nội thất châu Âu cao cấp, thiết kế sang trọng. Hồ bơi vô cực, gym, spa, sân tennis. Gần Metro, trường quốc tế, siêu thị. Bàn giao ngay, sổ hồng đầy đủ.',
    price: 9800000000,
    location: 'Estella Heights, 2 Đường số 6',
    district: 'Quận 2',
    city: 'Hồ Chí Minh',
    bedrooms: 3,
    bathrooms: 3,
    area: 130,
    propertyType: 'APARTMENT',
    status: 'AVAILABLE',
    isFeatured: true,
    featuredUntil: '2026-01-31T00:00:00Z',
    trustScore: 95,
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ],
    sellerId: 'user-1',
    sellerName: 'Nguyễn Văn Minh',
    views: 1432,
    inquiries: 31,
    createdAt: '2025-11-25T00:00:00Z',
    updatedAt: '2025-12-27T00:00:00Z',
  },
  {
    id: 'listing-8',
    title: 'Đất nền Nhà Bè - Gần cầu Phú Mỹ',
    description:
      'Đất nền khu dân cư Nhà Bè, diện tích 100m2, mặt tiền 5m. Đường nhựa 12m, điện nước đầy đủ. Gần cầu Phú Mỹ, thuận tiện di chuyển Q1, Q7. Phù hợp xây nhà ở hoặc đầu tư. Sổ hồng riêng, pháp lý rõ ràng.',
    price: 4500000000,
    location: 'Khu dân cư Phú Xuân, Nhà Bè',
    district: 'Nhà Bè',
    city: 'Hồ Chí Minh',
    bedrooms: 0,
    bathrooms: 0,
    area: 100,
    propertyType: 'LAND',
    status: 'AVAILABLE',
    isFeatured: false,
    trustScore: 86,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    ],
    sellerId: 'user-2',
    sellerName: 'Trần Thị Hương',
    views: 654,
    inquiries: 16,
    createdAt: '2025-12-05T00:00:00Z',
    updatedAt: '2025-12-23T00:00:00Z',
  },
  {
    id: 'listing-9',
    title: 'Đất nền Long Thành - Gần sân bay quốc tế',
    description:
      'Đất nền khu dân cư Long Thành, cách sân bay Long Thành 3km. Diện tích 150m2, mặt tiền 7.5m, đường nhựa 16m. Điện nước đầy đủ, hạ tầng hoàn thiện. Vị trí đắc địa, tiềm năng tăng giá cao khi sân bay đi vào hoạt động. Sổ hồng riêng, pháp lý rõ ràng.',
    price: 2800000000,
    location: 'Khu dân cư Long Thành Center, Long Thành',
    district: 'Long Thành',
    city: 'Đồng Nai',
    bedrooms: 0,
    bathrooms: 0,
    area: 150,
    propertyType: 'LAND',
    status: 'AVAILABLE',
    isFeatured: true,
    featuredUntil: '2026-01-31T00:00:00Z',
    trustScore: 92,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
    ],
    sellerId: 'user-3',
    sellerName: 'Lê Hoàng Nam',
    views: 1876,
    inquiries: 42,
    createdAt: '2025-11-10T00:00:00Z',
    updatedAt: '2025-12-27T00:00:00Z',
  },
  {
    id: 'listing-10',
    title: 'Đất nền Long Thành - Khu công nghiệp',
    description:
      'Đất nền Long Thành gần khu công nghiệp, diện tích 200m2. Mặt tiền đường chính 10m, thích hợp xây xưởng hoặc kho bãi. Cách sân bay Long Thành 5km, gần khu công nghiệp Nhơn Trạch. Hạ tầng đầy đủ, giá đầu tư tốt. Sổ đỏ chính chủ.',
    price: 3200000000,
    location: 'Khu công nghiệp Long Thành, Long Thành',
    district: 'Long Thành',
    city: 'Đồng Nai',
    bedrooms: 0,
    bathrooms: 0,
    area: 200,
    propertyType: 'LAND',
    status: 'AVAILABLE',
    isFeatured: false,
    trustScore: 88,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    ],
    sellerId: 'user-2',
    sellerName: 'Trần Thị Hương',
    views: 1234,
    inquiries: 31,
    createdAt: '2025-11-28T00:00:00Z',
    updatedAt: '2025-12-26T00:00:00Z',
  },
  {
    id: 'listing-11',
    title: 'Đất nền Long Thành - Mặt tiền Quốc lộ 51',
    description:
      'Đất nền mặt tiền Quốc lộ 51, Long Thành. Diện tích 300m2, mặt tiền 12m. Vị trí đắc địa, thích hợp kinh doanh, xây khách sạn, nhà hàng. Cách sân bay Long Thành 4km, giao thông thuận tiện. Pháp lý đầy đủ, sổ hồng riêng. Tiềm năng sinh lời cao.',
    price: 8500000000,
    location: 'Mặt tiền Quốc lộ 51, Long Thành',
    district: 'Long Thành',
    city: 'Đồng Nai',
    bedrooms: 0,
    bathrooms: 0,
    area: 300,
    propertyType: 'LAND',
    status: 'AVAILABLE',
    isFeatured: true,
    featuredUntil: '2026-02-15T00:00:00Z',
    trustScore: 94,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
    ],
    sellerId: 'user-3',
    sellerName: 'Lê Hoàng Nam',
    views: 2345,
    inquiries: 56,
    createdAt: '2025-10-20T00:00:00Z',
    updatedAt: '2025-12-27T00:00:00Z',
  },
  {
    id: 'listing-12',
    title: 'Đất nền Long Thành - Khu dân cư Bàu Cạn',
    description:
      'Đất nền khu dân cư Bàu Cạn, Long Thành. Diện tích 120m2, nằm trong khu quy hoạch đồng bộ. Đường nội bộ 12m, điện nước đầy đủ. Gần trường học, chợ, bệnh viện. Cách sân bay 6km. Phù hợp xây nhà ở hoặc đầu tư dài hạn. Giá hợp lý.',
    price: 2200000000,
    location: 'Khu dân cư Bàu Cạn, Long Thành',
    district: 'Long Thành',
    city: 'Đồng Nai',
    bedrooms: 0,
    bathrooms: 0,
    area: 120,
    propertyType: 'LAND',
    status: 'AVAILABLE',
    isFeatured: false,
    trustScore: 89,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    ],
    sellerId: 'user-1',
    sellerName: 'Nguyễn Văn Minh',
    views: 987,
    inquiries: 24,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2025-12-25T00:00:00Z',
  },
];

export const mockInquiries: Inquiry[] = [
  {
    id: 'inquiry-1',
    listingId: 'listing-1',
    listingTitle: 'Modern 3BR Apartment in District 7',
    buyerId: 'buyer-1',
    buyerName: 'Nguyen Van A',
    buyerEmail: 'nguyenvana@email.com',
    message: "I'm interested in viewing this property. Is it still available?",
    status: 'NEW',
    createdAt: '2025-12-27T10:30:00Z',
  },
  {
    id: 'inquiry-2',
    listingId: 'listing-3',
    listingTitle: 'Luxury Penthouse with Ocean View',
    buyerId: 'buyer-2',
    buyerName: 'Tran Thi B',
    buyerEmail: 'tranthib@email.com',
    message: 'Can you provide more details about the rooftop garden?',
    status: 'REPLIED',
    createdAt: '2025-12-26T14:15:00Z',
  },
  {
    id: 'inquiry-3',
    listingId: 'listing-1',
    listingTitle: 'Modern 3BR Apartment in District 7',
    buyerId: 'buyer-3',
    buyerName: 'Le Van C',
    buyerEmail: 'levanc@email.com',
    message: 'What is the monthly maintenance fee?',
    status: 'CLOSED',
    createdAt: '2025-12-20T09:00:00Z',
  },
];

export const mockSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'plan-free',
    name: 'FREE',
    price: 0,
    features: [
      '3 active listings',
      'Basic support',
      'Standard listing visibility',
    ],
    maxListings: 3,
    featuredListingsPerMonth: 0,
  },
  {
    id: 'plan-pro',
    name: 'PRO',
    price: 99000,
    features: [
      '20 active listings',
      '5 featured listings per month',
      'Priority support',
      'Analytics dashboard',
      'Email notifications',
    ],
    maxListings: 20,
    featuredListingsPerMonth: 5,
  },
  {
    id: 'plan-enterprise',
    name: 'ENTERPRISE',
    price: 299000,
    features: [
      'Unlimited listings',
      '20 featured listings per month',
      '24/7 dedicated support',
      'Advanced analytics',
      'API access',
      'Custom branding',
    ],
    maxListings: -1, // unlimited
    featuredListingsPerMonth: 20,
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: 'txn-1',
    userId: 'user-1',
    userName: 'Nguyen Van A',
    plan: 'PRO',
    amount: 99000,
    status: 'SUCCESS',
    createdAt: '2025-12-27T08:00:00Z',
  },
  {
    id: 'txn-2',
    userId: 'user-3',
    userName: 'Tran Thi B',
    plan: 'ENTERPRISE',
    amount: 299000,
    status: 'SUCCESS',
    createdAt: '2025-12-27T09:30:00Z',
  },
  {
    id: 'txn-3',
    userId: 'user-2',
    userName: 'Le Van C',
    plan: 'PRO',
    amount: 99000,
    status: 'PENDING',
    createdAt: '2025-12-27T11:00:00Z',
  },
];

export const mockRevenueStats: RevenueStats = {
  totalRevenue: 45600000,
  mrr: 12800000,
  activeSubscriptions: 156,
  arpu: 82000,
  freeUsers: 234,
  proUsers: 128,
  enterpriseUsers: 28,
};

export const mockSellerStats: SellerStats = {
  totalViews: 1234,
  totalInquiries: 45,
  activeListings: 5,
  conversionRate: 12,
};

// Sidebar: Agent Profile
export interface AgentProfile {
  id: string;
  fullName: string;
  avatar: string;
  badge: string;
  memberSince: string;
  totalListings: number;
  isVerified: boolean;
  phone: string;
  zaloLink: string;
  profileLink: string;
}

export const mockAgentProfile: AgentProfile = {
  id: 'agent-1',
  fullName: 'Trần Tín',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  badge: 'Môi giới chuyên nghiệp',
  memberSince: '2 năm',
  totalListings: 435,
  isVerified: true,
  phone: '0568 436 ***',
  zaloLink: '#',
  profileLink: '/marketplace/agent/agent-1',
};

// Sidebar: Area Links
export interface AreaLink {
  name: string;
  count: number;
  href: string;
}

export interface DistrictArea {
  districtName: string;
  areas: AreaLink[];
}

export const mockDistrictAreas: DistrictArea[] = [
  {
    districtName: 'Long Thành',
    areas: [
      { name: 'Bàu Cạn', count: 43, href: '#' },
      { name: 'An Phước', count: 31, href: '#' },
      { name: 'Long An', count: 16, href: '#' },
      { name: 'Phước Bình', count: 14, href: '#' },
      { name: 'Tam An', count: 7, href: '#' },
      { name: 'Lộc An', count: 5, href: '#' },
      { name: 'Phước Thái', count: 3, href: '#' },
      { name: 'Tân Hiệp', count: 3, href: '#' },
      { name: 'Bình Sơn', count: 2, href: '#' },
    ],
  },
];

// Sidebar: Featured Listings
export interface FeaturedListingLink {
  title: string;
  href: string;
}

export const mockFeaturedListingLinks: FeaturedListingLink[] = [
  { title: 'Nhà đất Bình Dương', href: '#' },
  { title: 'Bán nhà Núi Thành', href: '#' },
  { title: 'Bán nhà Đường 41679', href: '#' },
  { title: 'Bán nhà Tiểu La', href: '#' },
  { title: 'Bán nhà Thôi Tam Thôn', href: '#' },
  { title: 'Bán nhà Hoàng Thúc Trâm', href: '#' },
  { title: 'Chung cư Mường Thanh Đà Nẵng', href: '#' },
  { title: 'Chung cư The Monarchy', href: '#' },
  { title: 'Bán biệt thự Cityland Garden Hills', href: '#' },
  { title: 'Bán nhà mặt tiền Tiểu La', href: '#' },
  { title: 'Bán nhà mặt tiền Lê Duẩn Hải Châu', href: '#' },
  { title: 'Bán nhà Quận 5', href: '#' },
  { title: 'Căn hộ Vinpearl Condotel Đà Nẵng', href: '#' },
  { title: 'Căn hộ Moonlight Garden', href: '#' },
  { title: 'Chung cư TMS Luxury Đà Nẵng', href: '#' },
  { title: 'Đất nền Long Thành gần sân bay', href: '#' },
];

// Agent Profile Page Data
export interface AgentListing {
  id: string;
  title: string;
  price: number;
  area: number;
  location: string;
  images: string[];
  photoCount: number;
  isExpired: boolean;
  postedDateLabel: string;
  propertyType: 'APARTMENT' | 'HOUSE' | 'LAND' | 'VILLA';
}

export interface AgentProfilePageData {
  coverImage: string;
  viewCount: number;
  certificateNumber: string;
  agentLocation: string;
  saleCount: number;
  rentCount: number;
  saleListings: AgentListing[];
  rentListings: AgentListing[];
}

export const mockAgentProfilePageData: AgentProfilePageData = {
  coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&h=400&fit=crop',
  viewCount: 4941,
  certificateNumber: 'DN-003389',
  agentLocation: 'Đất tại xã Bàu Cạn, huyện Long Thành',
  saleCount: 11,
  rentCount: 0,
  saleListings: [
    {
      id: 'agent-listing-1',
      title: 'Bán đất nền Long Thành gần sân bay, SHR, thổ cư 100%',
      price: 2800000000,
      area: 150,
      location: 'Bàu Cạn, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      ],
      photoCount: 3,
      isExpired: false,
      postedDateLabel: 'Đăng hôm nay',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-2',
      title: 'Đất nền KDC Bàu Cạn, MT đường 25m, giá F0 chủ đầu tư',
      price: 3200000000,
      area: 120,
      location: 'Bàu Cạn, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      ],
      photoCount: 2,
      isExpired: false,
      postedDateLabel: 'Đăng hôm nay',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-3',
      title: 'Bán đất mặt tiền QL51 Long Thành, DT 300m², kinh doanh tốt',
      price: 8500000000,
      area: 300,
      location: 'Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      ],
      photoCount: 1,
      isExpired: false,
      postedDateLabel: 'Đăng 2 ngày trước',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-4',
      title: 'Đất nền An Phước Long Thành, gần KCN Amata, giá rẻ',
      price: 2200000000,
      area: 100,
      location: 'An Phước, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      ],
      photoCount: 4,
      isExpired: true,
      postedDateLabel: 'Đăng 13 ngày trước',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-5',
      title: 'Bán đất Phước Bình Long Thành, cách sân bay 3km, SHR',
      price: 1800000000,
      area: 80,
      location: 'Phước Bình, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
      ],
      photoCount: 2,
      isExpired: true,
      postedDateLabel: 'Đăng 15 ngày trước',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-6',
      title: 'Đất nền Tam An Long Thành, hạ tầng hoàn thiện, giá đầu tư',
      price: 2500000000,
      area: 110,
      location: 'Tam An, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
      ],
      photoCount: 3,
      isExpired: false,
      postedDateLabel: 'Đăng 5 ngày trước',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-7',
      title: 'Bán đất Lộc An Long Thành, view hồ đẹp, thổ cư 100%',
      price: 3500000000,
      area: 200,
      location: 'Lộc An, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      ],
      photoCount: 1,
      isExpired: false,
      postedDateLabel: 'Đăng 7 ngày trước',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-8',
      title: 'Đất nền Tân Hiệp Long Thành, gần chợ, trường học',
      price: 1950000000,
      area: 90,
      location: 'Tân Hiệp, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      ],
      photoCount: 2,
      isExpired: false,
      postedDateLabel: 'Đăng 10 ngày trước',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-9',
      title: 'Bán đất Bình Sơn Long Thành, cạnh KCN, giá gốc CĐT',
      price: 2100000000,
      area: 105,
      location: 'Bình Sơn, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      ],
      photoCount: 3,
      isExpired: true,
      postedDateLabel: 'Đăng 20 ngày trước',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-10',
      title: 'Đất nền Long An, Long Thành, DT 160m², đường 12m',
      price: 2600000000,
      area: 160,
      location: 'Long An, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
      ],
      photoCount: 1,
      isExpired: false,
      postedDateLabel: 'Đăng 3 ngày trước',
      propertyType: 'LAND',
    },
    {
      id: 'agent-listing-11',
      title: 'Bán đất Phước Thái Long Thành, gần trung tâm hành chính',
      price: 3100000000,
      area: 140,
      location: 'Phước Thái, Long Thành, Đồng Nai',
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800',
      ],
      photoCount: 2,
      isExpired: false,
      postedDateLabel: 'Đăng 8 ngày trước',
      propertyType: 'LAND',
    },
  ],
  rentListings: [],
};

// === Browse Sidebar Data ===

export const mockPriceRanges = [
  { label: 'Thỏa thuận', value: 'negotiable', href: '#' },
  { label: 'Dưới 1 triệu', value: 'under-1m', href: '#' },
  { label: '1 - 3 triệu', value: '1-3m', href: '#' },
  { label: '3 - 5 triệu', value: '3-5m', href: '#' },
  { label: '5 - 10 triệu', value: '5-10m', href: '#' },
  { label: '10 - 40 triệu', value: '10-40m', href: '#' },
  { label: '40 - 70 triệu', value: '40-70m', href: '#' },
  { label: '70 - 100 triệu', value: '70-100m', href: '#' },
  { label: 'Trên 100 triệu', value: 'over-100m', href: '#' },
];

export const mockAreaRanges = [
  { label: 'Dưới 30 m²', value: 'under-30', href: '#' },
  { label: '30 - 50 m²', value: '30-50', href: '#' },
  { label: '50 - 80 m²', value: '50-80', href: '#' },
  { label: '80 - 100 m²', value: '80-100', href: '#' },
  { label: '100 - 150 m²', value: '100-150', href: '#' },
  { label: '150 - 200 m²', value: '150-200', href: '#' },
  { label: '200 - 250 m²', value: '200-250', href: '#' },
  { label: '250 - 300 m²', value: '250-300', href: '#' },
  { label: '300 - 500 m²', value: '300-500', href: '#' },
  { label: 'Trên 500 m²', value: 'over-500', href: '#' },
];

export const mockCityListings = [
  { name: 'Hồ Chí Minh', count: 15755, href: '#' },
  { name: 'Hà Nội', count: 6536, href: '#' },
  { name: 'Bình Dương', count: 731, href: '#' },
  { name: 'Đà Nẵng', count: 546, href: '#' },
  { name: 'Hải Phòng', count: 250, href: '#' },
  { name: 'Khánh Hòa', count: 201, href: '#' },
  { name: 'Đồng Nai', count: 173, href: '#' },
  { name: 'Hưng Yên', count: 164, href: '#' },
  { name: 'Long An', count: 162, href: '#' },
  { name: 'Bà Rịa Vũng Tàu', count: 149, href: '#' },
  { name: 'Bắc Ninh', count: 132, href: '#' },
  { name: 'Thanh Hóa', count: 118, href: '#' },
  { name: 'Nghệ An', count: 95, href: '#' },
  { name: 'Thừa Thiên Huế', count: 87, href: '#' },
  { name: 'Cần Thơ', count: 76, href: '#' },
];

export const mockPopularArticles = [
  { title: 'Giá nhà đất Long Thành tăng mạnh sau tin sân bay khởi công', href: '#' },
  { title: 'Top 10 khu vực đầu tư BĐS tiềm năng nhất 2026', href: '#' },
  { title: 'Hướng dẫn kiểm tra pháp lý đất nền trước khi mua', href: '#' },
  { title: 'So sánh giá thuê căn hộ TP.HCM vs Hà Nội 2026', href: '#' },
  { title: 'Xu hướng thị trường BĐS quý 1/2026: Phân tích chi tiết', href: '#' },
  { title: '5 sai lầm phổ biến khi mua nhà lần đầu', href: '#' },
  { title: 'Đất nền vùng ven: Cơ hội hay rủi ro?', href: '#' },
  { title: 'Chính sách tín dụng BĐS mới nhất từ ngân hàng nhà nước', href: '#' },
];
