// Public Marketplace Module Types

export interface PublicUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  subscriptionTier: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscriptionExpiry?: string;
  createdAt: string;
}

export type VipTier = 'DIAMOND' | 'GOLD' | 'SILVER' | 'NONE';

export interface PublicListing {
  id: string;
  title: string;
  description: string;
  price: number;
  pricePerM2?: number;
  location: string;
  district: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  propertyType: 'APARTMENT' | 'HOUSE' | 'LAND' | 'VILLA';
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  isFeatured: boolean;
  featuredUntil?: string;
  vipTier: VipTier;
  trustScore: number;
  images: string[];
  imageCount: number;
  hasVideo: boolean;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  sellerVerified: boolean;
  sellerPhone: string;
  views: number;
  inquiries: number;
  isSaved: boolean;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inquiry {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  message: string;
  status: 'NEW' | 'REPLIED' | 'CLOSED';
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: 'FREE' | 'PRO' | 'ENTERPRISE';
  price: number;
  features: string[];
  maxListings: number;
  featuredListingsPerMonth: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  createdAt: string;
}

export interface RevenueStats {
  totalRevenue: number;
  mrr: number;
  activeSubscriptions: number;
  arpu: number;
  freeUsers: number;
  proUsers: number;
  enterpriseUsers: number;
}

export interface SellerStats {
  totalViews: number;
  totalInquiries: number;
  activeListings: number;
  conversionRate: number;
}
