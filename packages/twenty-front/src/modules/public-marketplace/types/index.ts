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

export interface PublicListing {
  id: string;
  title: string;
  description: string;
  price: number;
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
  trustScore: number;
  images: string[];
  sellerId: string;
  sellerName: string;
  views: number;
  inquiries: number;
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
