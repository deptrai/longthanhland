# Architecture Document: Custom Build
## Real Estate Distribution Platform + Public Marketplace

**Architect**: Winston
**Date**: 19/01/2026
**Version**: 2.0 (Custom Build)
**Based on**: PRD v1.4, Architecture Evaluation Report
**Decision**: Custom Build với NestJS + Next.js + Supabase

---

## Executive Summary

Kiến trúc này mô tả cách xây dựng **Real Estate Distribution Platform** từ đầu với modern tech stack: **NestJS + Next.js 14 + Supabase**. Architecture được thiết kế để support cả **Internal CRM** (Epic 1-7) và **Public Marketplace** (Epic 8) một cách native, không có technical debt từ framework customization.

**Key Architectural Decisions**:
1. **Microservices-ready**: Monolith đầu tiên, có thể tách thành microservices sau
2. **Next.js SSR**: Native SEO support cho Public Marketplace
3. **Supabase**: PostgreSQL + Auth + Storage + Realtime trong một platform
4. **Event-Driven**: BullMQ cho async operations, Supabase Realtime cho live updates
5. **Row Level Security**: Database-level multi-tenancy

---

## 1. Technology Stack

### 1.1. Backend

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Framework** | NestJS | 10.x | TypeScript-first, modular, enterprise-ready |
| **Database** | Supabase (PostgreSQL) | 15.x | Managed PostgreSQL + Auth + Storage + Realtime |
| **ORM** | Prisma | 5.x | Type-safe, excellent DX, migration management |
| **Authentication** | Supabase Auth | Latest | Built-in email/phone verification, social login |
| **Queue** | BullMQ | 5.x | Redis-based job queue, delayed jobs, retry |
| **Cache** | Redis | 7.x | Session cache, API cache, queue backend |
| **API** | GraphQL + REST | - | GraphQL cho internal, REST cho public |
| **GraphQL Server** | Apollo Server | 4.x | Industry standard, good tooling |
| **Validation** | class-validator + Zod | Latest | DTO validation (NestJS) + schema validation |
| **File Storage** | Supabase Storage | Latest | S3-compatible, CDN integration |

### 1.2. Frontend

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Framework** | Next.js | 14.x | App Router, native SSR, excellent SEO |
| **UI Library** | React | 18.x | Industry standard |
| **Styling** | Tailwind CSS | 3.x | Utility-first, rapid development |
| **Component Library** | shadcn/ui | Latest | Accessible, customizable, Tailwind-based |
| **State Management** | Zustand | 4.x | Lightweight, simple API vs Redux/Recoil |
| **Forms** | React Hook Form | 7.x | Performant, good DX |
| **Validation** | Zod | 3.x | TypeScript-first schema validation |
| **Data Fetching** | TanStack Query | 5.x | Caching, refetching, optimistic updates |
| **GraphQL Client** | Apollo Client | 3.x | For internal admin dashboard |
| **Charts** | Recharts | 2.x | React-based, customizable |
| **Maps** | Google Maps API | Latest | Location autocomplete, map display |

### 1.3. AI/ML Services

| Component | Technology | Provider | Rationale |
|-----------|-----------|----------|-----------|
| **LLM** | GPT-4 | OpenAI (v98store key) | Summary generation, content analysis |
| **Web Scraping** | Perplexica API | Self-hosted | Research agent, price verification |
| **Edge Functions** | Supabase Edge Functions | Deno runtime | Serverless AI workloads |

### 1.4. DevOps & Infrastructure

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Deployment (Frontend)** | Vercel | Next.js native, edge deployment, zero-config |
| **Deployment (Backend)** | Dokploy | Self-hosted PaaS, Docker-based |
| **CI/CD** | GitHub Actions | Free for public repos, good integration |
| **Monitoring** | Sentry | Error tracking, performance monitoring |
| **Logging** | Supabase Dashboard + Winston | Centralized logging |
| **Analytics** | Supabase Analytics | Built-in, privacy-friendly |

---

## 2. System Architecture

### 2.1. High-Level Architecture

```mermaid
flowchart TB
    subgraph Public["Public Users"]
        BUYER[Buyers<br/>Browse listings]
        SELLER[Sellers<br/>Post listings]
        BOT[Search Bots<br/>Googlebot, etc.]
    end

    subgraph Internal["Internal Users"]
        ADMIN[Admins<br/>Full access]
        SALES[Sales Agents<br/>1000+ users]
        FINANCE[Finance<br/>Commission mgmt]
    end

    subgraph Frontend["Frontend Layer"]
        NEXTJS["Next.js 14 (Vercel)<br/>Public pages + SSR"]
        ADMIN_UI["Admin Dashboard<br/>Internal CRM UI"]
    end

    subgraph Backend["Backend Layer (NestJS on Dokploy)"]
        GRAPHQL[GraphQL API<br/>Internal operations]
        REST[REST API<br/>Public marketplace]

        subgraph Modules
            AUTH[Auth Module]
            CRM[CRM Module<br/>Projects, Properties, Deals]
            MARKETPLACE[Marketplace Module<br/>Public listings]
            COMMISSION[Commission Module]
            LEAD[Lead Module]
        end
    end

    subgraph AI["AI Services (Supabase Edge Functions)"]
        RESEARCH["Research Agent<br/>Web scraping"]
        SUMMARY["Summary Generator<br/>GPT-4"]
        TRUST["Trust Score<br/>Calculator"]
        SPAM["Spam Filter<br/>Rule-based + ML"]
    end

    subgraph Data["Data Layer"]
        SUPABASE["Supabase<br/>PostgreSQL 15"]
        STORAGE["Supabase Storage<br/>Images, documents"]
        REALTIME["Supabase Realtime<br/>WebSockets"]
        REDIS[(Redis<br/>Cache + Queue)]
    end

    BUYER --> NEXTJS
    SELLER --> NEXTJS
    BOT --> NEXTJS

    ADMIN --> ADMIN_UI
    SALES --> ADMIN_UI
    FINANCE --> ADMIN_UI

    NEXTJS --> REST
    ADMIN_UI --> GRAPHQL

    GRAPHQL --> AUTH
    REST --> AUTH

    GRAPHQL --> CRM
    GRAPHQL --> COMMISSION
    GRAPHQL --> LEAD

    REST --> MARKETPLACE

    MARKETPLACE --> RESEARCH
    MARKETPLACE --> SUMMARY
    MARKETPLACE --> TRUST
    MARKETPLACE --> SPAM

    CRM --> SUPABASE
    MARKETPLACE --> SUPABASE
    COMMISSION --> SUPABASE
    LEAD --> SUPABASE

    AUTH --> SUPABASE

    MARKETPLACE --> STORAGE
    CRM --> STORAGE

    CRM --> REALTIME
    MARKETPLACE --> REALTIME

    GRAPHQL --> REDIS
    REST --> REDIS

    RESEARCH --> SUPABASE
    SUMMARY --> SUPABASE
```

### 2.2. Project Structure

```
real-estate-platform/
├── apps/
│   ├── backend/                    # NestJS API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/          # Authentication
│   │   │   │   ├── crm/           # Internal CRM (Epic 1-7)
│   │   │   │   │   ├── projects/
│   │   │   │   │   ├── properties/
│   │   │   │   │   ├── contacts/
│   │   │   │   │   ├── deals/
│   │   │   │   │   └── reservations/
│   │   │   │   ├── commission/    # Commission management
│   │   │   │   ├── lead/          # Lead assignment
│   │   │   │   ├── marketplace/   # Public marketplace (Epic 8)
│   │   │   │   │   ├── public-users/
│   │   │   │   │   ├── public-listings/
│   │   │   │   │   ├── inquiries/
│   │   │   │   │   └── subscriptions/
│   │   │   │   └── ai/            # AI services integration
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   ├── decorators/
│   │   │   │   └── filters/
│   │   │   ├── config/
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── test/
│   │
│   └── frontend/                   # Next.js 14
│       ├── app/                    # App Router
│       │   ├── (public)/          # Public marketplace
│       │   │   ├── page.tsx       # Homepage
│       │   │   ├── listings/
│       │   │   │   ├── page.tsx   # Browse listings
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx  # Listing detail (SSR)
│       │   │   ├── auth/
│       │   │   │   ├── login/
│       │   │   │   └── register/
│       │   │   └── dashboard/     # Seller dashboard
│       │   │
│       │   └── (admin)/           # Internal CRM
│       │       ├── admin/
│       │       │   ├── projects/
│       │       │   ├── properties/
│       │       │   ├── deals/
│       │       │   └── commissions/
│       │       └── agent/         # Sales agent dashboard
│       │
│       ├── components/
│       │   ├── ui/                # shadcn/ui components
│       │   ├── public/            # Public marketplace components
│       │   └── admin/             # Admin dashboard components
│       │
│       ├── lib/
│       │   ├── supabase/          # Supabase client
│       │   ├── apollo/            # Apollo client (GraphQL)
│       │   └── utils/
│       │
│       └── public/
│
├── packages/
│   ├── shared/                     # Shared types, utils
│   │   ├── types/
│   │   └── constants/
│   └── ai-functions/               # Supabase Edge Functions
│       ├── research-agent/
│       ├── summary-generator/
│       ├── trust-score/
│       └── spam-filter/
│
├── docs/
│   └── real-estate-platform/
│       ├── prd-v1.4.md
│       ├── architecture-custom-build.md  # This file
│       └── epics.md
│
└── docker-compose.yml              # Local development
```

---

## 3. Database Architecture

### 3.1. Prisma Schema (Simplified)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// INTERNAL CRM (Epic 1-7)
// ============================================

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      UserRole

  // Sales agent fields
  salesTier          String?
  totalDeals         Int      @default(0)
  totalCommission    Decimal  @default(0)
  phoneNumber        String?
  bankAccountName    String?
  bankAccountNumber  String?
  bankName           String?

  // Relations
  reservedProperties Property[]    @relation("ReservedBy")
  deals              Deal[]        @relation("SalesAgent")
  commissions        Commission[]
  assignedLeads      Lead[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  ADMIN
  SALES_AGENT
  FINANCE
  MANAGER
}

model Project {
  id                  String   @id @default(uuid())
  name                String
  developer           String?
  location            String?
  area                String?
  totalPlots          Int?
  status              ProjectStatus
  legalStatus         String?
  description         String?
  masterPlanImageUrl  String?
  galleryUrls         String[]
  startDate           DateTime?
  completionDate      DateTime?
  priceMin            Decimal?
  priceMax            Decimal?
  commissionRate      Decimal?

  // Relations
  properties Property[]
  leads      Lead[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum ProjectStatus {
  PLANNING
  ACTIVE
  SOLD_OUT
  SUSPENDED
}

model Property {
  id              String   @id @default(uuid())
  projectId       String
  plotNumber      String
  area            Decimal
  price           Decimal
  pricePerSqm     Decimal?
  status          PropertyStatus
  direction       String?
  roadWidth       Decimal?
  legalDoc        String?
  location        String?

  // Reservation
  reservedById    String?
  reservedUntil   DateTime?

  // Sale
  soldToId        String?
  soldDate        DateTime?

  notes           String?
  commissionAmount Decimal?

  // Relations
  project      Project     @relation(fields: [projectId], references: [id])
  reservedBy   User?       @relation("ReservedBy", fields: [reservedById], references: [id])
  soldTo       Contact?    @relation(fields: [soldToId], references: [id])
  deal         Deal?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, plotNumber])
}

enum PropertyStatus {
  AVAILABLE
  RESERVED
  DEPOSIT_PAID
  CONTRACTED
  SOLD
}

model Contact {
  id              String   @id @default(uuid())
  name            String
  phone           String
  email           String?
  idNumber        String?  @db.Text // Encrypted
  idType          String?
  address         String?
  occupation      String?
  budget          Decimal?
  timeline        String?
  source          String?
  status          ContactStatus
  notes           String?
  assignedSalesId String?

  // Relations
  assignedSales User?      @relation(fields: [assignedSalesId], references: [id])
  properties    Property[]
  deals         Deal[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum ContactStatus {
  LEAD
  PROSPECT
  CUSTOMER
  INACTIVE
}

model Deal {
  id                 String   @id @default(uuid())
  propertyId         String   @unique
  contactId          String
  salesAgentId       String
  status             DealStatus
  dealValue          Decimal
  depositAmount      Decimal?
  depositDate        DateTime?
  expectedCloseDate  DateTime?
  actualCloseDate    DateTime?
  paymentMethod      String?
  notes              String?
  lostReason         String?

  // Relations
  property     Property    @relation(fields: [propertyId], references: [id])
  contact      Contact     @relation(fields: [contactId], references: [id])
  salesAgent   User        @relation("SalesAgent", fields: [salesAgentId], references: [id])
  commission   Commission?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum DealStatus {
  DRAFT
  ACTIVE
  NEGOTIATING
  PENDING_DEPOSIT
  DEPOSIT_PAID
  CONTRACTED
  WON
  LOST
}

model Commission {
  id               String   @id @default(uuid())
  dealId           String   @unique
  propertyId       String
  salesAgentId     String
  dealValue        Decimal
  commissionAmount Decimal
  status           CommissionStatus
  approvedById     String?
  approvedDate     DateTime?
  paidDate         DateTime?
  notes            String?

  // Relations
  deal         Deal    @relation(fields: [dealId], references: [id])
  salesAgent   User    @relation(fields: [salesAgentId], references: [id])
  approvedBy   User?   @relation("ApprovedBy", fields: [approvedById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum CommissionStatus {
  PENDING
  APPROVED
  PAID
  REJECTED
}

model Lead {
  id                  String   @id @default(uuid())
  source              String
  interestedProjectId String?
  budget              Decimal?
  timeline            String?
  assignedSalesId     String?
  autoAssigned        Boolean  @default(false)
  responseTime        Int?     // minutes
  firstResponseAt     DateTime?

  // Contact info
  name     String
  phone    String
  email    String?
  message  String?

  // Relations
  interestedProject Project? @relation(fields: [interestedProjectId], references: [id])
  assignedSales     User?    @relation(fields: [assignedSalesId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ============================================
// PUBLIC MARKETPLACE (Epic 8)
// ============================================

model PublicUser {
  id                   String   @id @default(uuid())
  email                String   @unique
  phone                String
  fullName             String
  userType             PublicUserType
  verified             Boolean  @default(false)
  emailVerified        Boolean  @default(false)
  phoneVerified        Boolean  @default(false)
  verifiedAt           DateTime?
  subscriptionTier     SubscriptionTier @default(FREE)
  subscriptionExpiresAt DateTime?

  // Computed fields (updated via triggers/jobs)
  totalListings    Int     @default(0)
  activeListings   Int     @default(0)
  responseRate     Decimal @default(0)
  avgResponseTime  Decimal @default(0)

  // Relations
  listings  PublicListing[]
  inquiries Inquiry[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum PublicUserType {
  BUYER
  SELLER
  BROKER
}

enum SubscriptionTier {
  FREE
  BASIC
  PRO
  ENTERPRISE
}

model PublicListing {
  id              String   @id @default(uuid())
  ownerId         String
  propertyId      String?  // Link to internal property if converted

  // Basic info
  title           String
  description     String
  listingType     ListingType
  propertyType    PropertyType
  price           Decimal
  area            Decimal

  // Location
  address         String
  province        String
  district        String
  ward            String?
  latitude        Decimal?
  longitude       Decimal?

  // Property details
  bedrooms        Int?
  bathrooms       Int?
  floor           Int?
  orientation     String?

  // Status
  status          ListingStatus
  verified        Boolean  @default(false)
  featured        Boolean  @default(false)

  // Metrics
  viewCount       Int      @default(0)
  contactCount    Int      @default(0)
  trustScore      Decimal  @default(0)
  spamScore       Decimal  @default(0)

  // Dates
  publishedAt     DateTime?
  expiresAt       DateTime?
  approvedAt      DateTime?
  rejectedReason  String?

  // AI-generated content
  aiSummary       String?

  // Images
  imageUrls       String[]

  // Relations
  owner           PublicUser        @relation(fields: [ownerId], references: [id])
  property        Property?         @relation(fields: [propertyId], references: [id])
  researchResult  AIResearchResult?
  inquiries       Inquiry[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum ListingType {
  SALE
  RENT
}

enum PropertyType {
  APARTMENT
  HOUSE
  LAND
  VILLA
  TOWNHOUSE
  OFFICE
}

enum ListingStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
  EXPIRED
  SOLD
}

model AIResearchResult {
  id                    String   @id @default(uuid())
  listingId             String   @unique
  sourcesChecked        Json     // Array of source names
  similarListingsFound  Json     // Array of similar listings
  priceRange            Json     // {min, max, avg}
  duplicateDetected     Boolean
  confidenceScore       Decimal
  status                ResearchStatus
  completedAt           DateTime?

  // Relations
  listing PublicListing @relation(fields: [listingId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum ResearchStatus {
  PENDING
  COMPLETED
  FAILED
}

model Inquiry {
  id                String   @id @default(uuid())
  listingId         String
  inquirerId        String?  // Null if anonymous
  message           String
  contactPhone      String
  contactEmail      String?
  preferredContact  String
  status            InquiryStatus
  notes             String?

  // Lead conversion
  convertedToDealId String?

  // Relations
  listing       PublicListing @relation(fields: [listingId], references: [id])
  inquirer      PublicUser?   @relation(fields: [inquirerId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum InquiryStatus {
  NEW
  CONTACTED
  CLOSED
}
```

### 3.2. Row Level Security (RLS) Policies

```sql
-- Enable RLS on public tables
ALTER TABLE public_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Public listings: Everyone can view approved listings
CREATE POLICY "Public listings viewable by all"
ON public_listings FOR SELECT
USING (status = 'APPROVED');

-- Public listings: Owners can view own listings
CREATE POLICY "Owners can view own listings"
ON public_listings FOR SELECT
USING (auth.uid() = owner_id);

-- Public listings: Owners can update own listings
CREATE POLICY "Owners can update own listings"
ON public_listings FOR UPDATE
USING (auth.uid() = owner_id);

-- Public listings: Admins can view all
CREATE POLICY "Admins can view all listings"
ON public_listings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Inquiries: Listing owners can view inquiries on their listings
CREATE POLICY "Listing owners can view inquiries"
ON inquiries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public_listings
    WHERE public_listings.id = inquiries.listing_id
    AND public_listings.owner_id = auth.uid()
  )
);
```

---

## 4. API Design

### 4.1. GraphQL API (Internal CRM)

**Schema Structure**:
```graphql
type Query {
  # Projects
  projects(filter: ProjectFilter, pagination: Pagination): ProjectConnection!
  project(id: ID!): Project

  # Properties
  properties(filter: PropertyFilter, pagination: Pagination): PropertyConnection!
  property(id: ID!): Property
  availableProperties(projectId: ID): [Property!]!

  # Deals
  deals(filter: DealFilter, pagination: Pagination): DealConnection!
  deal(id: ID!): Deal
  myDeals: [Deal!]!

  # Commissions
  commissions(filter: CommissionFilter): [Commission!]!
  myCommissions: [Commission!]!
  pendingCommissions: [Commission!]!

  # Sales Performance
  mySalesPerformance: SalesPerformance!
  salesLeaderboard(period: DateRange!, limit: Int): [SalesRanking!]!

  # Leads
  leads(filter: LeadFilter): [Lead!]!
  myLeads: [Lead!]!
}

type Mutation {
  # Properties
  createProperty(input: CreatePropertyInput!): Property!
  updateProperty(id: ID!, input: UpdatePropertyInput!): Property!
  reserveProperty(id: ID!): Property!
  releaseProperty(id: ID!): Property!

  # Deals
  createDeal(input: CreateDealInput!): Deal!
  updateDealStatus(id: ID!, status: DealStatus!): Deal!

  # Commissions
  approveCommission(id: ID!): Commission!
  rejectCommission(id: ID!, reason: String!): Commission!
  markCommissionPaid(id: ID!): Commission!

  # Leads
  assignLead(leadId: ID!, salesAgentId: ID!): Lead!
  autoAssignLead(leadId: ID!): Lead!
}

type Subscription {
  # Real-time updates
  propertyStatusChanged(projectId: ID): Property!
  newLeadAssigned(salesAgentId: ID!): Lead!
}
```

### 4.2. REST API (Public Marketplace)

**Endpoints**:
```
# Public Listings
GET    /api/v1/listings              # Browse listings (with filters)
GET    /api/v1/listings/:id          # Get listing detail
POST   /api/v1/listings              # Create listing (auth required)
PUT    /api/v1/listings/:id          # Update listing (auth required)
DELETE /api/v1/listings/:id          # Delete listing (auth required)

# Search
GET    /api/v1/search                # Search listings (full-text + filters)

# Inquiries
POST   /api/v1/inquiries             # Send inquiry (no auth required)
GET    /api/v1/inquiries             # Get own inquiries (auth required)

# Public Users
POST   /api/v1/auth/register         # Register
POST   /api/v1/auth/login            # Login
POST   /api/v1/auth/verify-email     # Verify email
POST   /api/v1/auth/verify-phone     # Verify phone
GET    /api/v1/users/me              # Get profile
PUT    /api/v1/users/me              # Update profile

# Subscriptions
GET    /api/v1/subscriptions/tiers   # Get subscription tiers
POST   /api/v1/subscriptions/upgrade # Upgrade subscription
```

---

## 5. Implementation Patterns

### 5.1. Reservation System (Pessimistic Locking)

```typescript
// apps/backend/src/modules/crm/properties/properties.service.ts

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private queue: Queue,
  ) {}

  async reserveProperty(propertyId: string, userId: string): Promise<Property> {
    return this.prisma.$transaction(async (tx) => {
      // Pessimistic lock
      const property = await tx.property.findUnique({
        where: { id: propertyId },
      });

      if (!property) {
        throw new NotFoundException('Property not found');
      }

      if (property.status !== 'AVAILABLE') {
        throw new BadRequestException(
          `Property is ${property.status}, cannot reserve`,
        );
      }

      // Update property
      const updated = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: 'RESERVED',
          reservedById: userId,
          reservedUntil: addHours(new Date(), 24),
        },
      });

      // Schedule auto-release job
      await this.queue.add(
        'release-reservation',
        { propertyId },
        {
          delay: 24 * 60 * 60 * 1000, // 24 hours
          jobId: `release-${propertyId}`,
        },
      );

      return updated;
    });
  }
}
```

### 5.2. Next.js SSR for SEO

```typescript
// apps/frontend/app/(public)/listings/[id]/page.tsx

import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

interface Props {
  params: { id: string };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: listing } = await supabase
    .from('public_listings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!listing) {
    return {
      title: 'Listing Not Found',
    };
  }

  return {
    title: `${listing.title} - ${listing.location}`,
    description: listing.description.substring(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description,
      images: [listing.imageUrls[0]],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: listing.title,
      description: listing.description,
      images: [listing.imageUrls[0]],
    },
  };
}

// Server-side rendering
export default async function ListingDetailPage({ params }: Props) {
  const { data: listing } = await supabase
    .from('public_listings')
    .select(`
      *,
      owner:public_users(*),
      researchResult:ai_research_results(*)
    `)
    .eq('id', params.id)
    .single();

  if (!listing) {
    notFound();
  }

  return <ListingDetail listing={listing} />;
}
```

### 5.3. Supabase Edge Function (AI Research)

```typescript
// packages/ai-functions/research-agent/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { listingId } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch listing
    const { data: listing } = await supabase
      .from('public_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (!listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
      });
    }

    // Research from multiple sources (using Perplexica API)
    const results = await Promise.all([
      searchBatDongSan(listing),
      searchChoTot(listing),
      searchGoogle(listing),
    ]);

    // Calculate confidence score
    const similarListings = results.flat();
    const confidenceScore = calculateConfidence(similarListings, listing);

    // Detect duplicates
    const duplicateDetected = similarListings.some(
      (r) =>
        r.address === listing.address &&
        Math.abs(r.price - listing.price) < 1000000,
    );

    // Save results
    await supabase.from('ai_research_results').upsert({
      listing_id: listingId,
      sources_checked: ['batdongsan', 'chotot', 'google'],
      similar_listings_found: similarListings,
      price_range: {
        min: Math.min(...similarListings.map((r) => r.price)),
        max: Math.max(...similarListings.map((r) => r.price)),
        avg: average(similarListings.map((r) => r.price)),
      },
      duplicate_detected: duplicateDetected,
      confidence_score: confidenceScore,
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        confidenceScore,
        duplicateDetected,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

// Helper functions
async function searchBatDongSan(listing: any) {
  // Implementation using Perplexica API
  // ...
}

function calculateConfidence(similarListings: any[], listing: any): number {
  // Implementation
  // ...
}
```

---

## 6. Deployment Architecture

### 6.1. Infrastructure Diagram

```mermaid
flowchart TB
    subgraph Internet
        USER[Users]
        BOT[Search Bots]
    end

    subgraph Vercel["Vercel (Next.js)"]
        EDGE[Edge Network<br/>Global CDN]
        NEXTJS[Next.js App<br/>SSR + Static]
    end

    subgraph Dokploy["Dokploy VPS"]
        NGINX[Nginx<br/>Reverse Proxy]
        NESTJS[NestJS API<br/>Docker Container]
        REDIS[(Redis<br/>Cache + Queue)]
    end

    subgraph Supabase["Supabase Cloud"]
        PG[(PostgreSQL 15<br/>Database)]
        AUTH[Auth Service]
        STORAGE[Storage<br/>S3-compatible]
        REALTIME[Realtime<br/>WebSockets]
        EDGE_FN[Edge Functions<br/>Deno Runtime]
    end

    USER --> EDGE
    BOT --> EDGE

    EDGE --> NEXTJS
    NEXTJS --> NGINX
    NGINX --> NESTJS

    NESTJS --> PG
    NESTJS --> AUTH
    NESTJS --> STORAGE
    NESTJS --> REALTIME
    NESTJS --> REDIS
    NESTJS --> EDGE_FN

    NEXTJS --> PG
    NEXTJS --> AUTH
    NEXTJS --> STORAGE
```

### 6.2. Environment Configuration

**Backend (.env)**:
```bash
# Database
DATABASE_URL="postgresql://user:password@db.supabase.co:5432/postgres"

# Supabase
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_ANON_KEY="eyJxxx..."
SUPABASE_SERVICE_ROLE_KEY="eyJxxx..."

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# OpenAI (via v98store)
OPENAI_API_KEY="sk-xxx"

# Perplexica
PERPLEXICA_API_URL="http://localhost:3001"

# File Upload
MAX_FILE_SIZE=20971520  # 20MB
ALLOWED_IMAGE_TYPES="jpg,jpeg,png,webp"
```

**Frontend (.env.local)**:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJxxx..."

# API
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
NEXT_PUBLIC_GRAPHQL_URL="https://api.yourdomain.com/graphql"

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaxxx"

# Analytics
NEXT_PUBLIC_GA_ID="G-xxx"
```

---

## 7. Development Workflow

### 7.1. Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/yourorg/real-estate-platform.git
cd real-estate-platform

# 2. Install dependencies
pnpm install

# 3. Setup Supabase project
# - Create project at supabase.com
# - Copy connection string and keys to .env

# 4. Setup database
cd apps/backend
pnpm prisma migrate dev
pnpm prisma db seed

# 5. Start services
docker-compose up -d  # Redis

# 6. Start development servers
pnpm dev  # Starts both backend and frontend
```

### 7.2. Testing Strategy

**Unit Tests**:
- Jest for backend (NestJS)
- Vitest for frontend (Next.js)
- Target: >80% coverage

**Integration Tests**:
- Supertest for API endpoints
- Prisma test database

**E2E Tests**:
- Playwright for critical user flows
- Focus on: reservation, deal creation, listing approval

---

## 8. Migration from Twenty CRM (If Applicable)

Nếu đã có data trong Twenty CRM:

**Step 1: Data Export**
```typescript
// Export script
const exportData = async () => {
  // Export projects, properties, deals, etc.
  const projects = await twentyClient.query({ ... });

  // Save to JSON
  fs.writeFileSync('export/projects.json', JSON.stringify(projects));
};
```

**Step 2: Data Transform**
```typescript
// Transform Twenty schema to Prisma schema
const transform = (twentyData) => {
  return {
    id: twentyData.id,
    name: twentyData.name,
    // Map fields...
  };
};
```

**Step 3: Data Import**
```typescript
// Import to new database
const importData = async () => {
  const projects = JSON.parse(fs.readFileSync('export/projects.json'));

  await prisma.project.createMany({
    data: projects.map(transform),
  });
};
```

---

## 9. Success Metrics & Monitoring

### 9.1. Technical Metrics

| Metric | Target | Tool |
|--------|--------|------|
| API Response Time | < 200ms | Sentry Performance |
| SSR Render Time | < 500ms | Vercel Analytics |
| Database Query Time | < 50ms | Prisma Metrics |
| Cache Hit Rate | > 80% | Redis INFO |
| Error Rate | < 0.1% | Sentry |
| Uptime | > 99.5% | UptimeRobot |

### 9.2. Business Metrics

| Metric | Target | Source |
|--------|--------|--------|
| Qualified Leads/Month | 500 by Month 12 | Supabase Analytics |
| Public Users | 5,000 Year 1 | Supabase Auth |
| Lead Conversion Rate | 10-15% | Custom Dashboard |
| Lighthouse SEO Score | > 90 | Lighthouse CI |
| Page Indexing Time | < 48 hours | Google Search Console |

---

## Conclusion

Architecture này được thiết kế để:

1. ✅ **Native support** cho cả Internal CRM và Public Marketplace
2. ✅ **SEO-first** với Next.js SSR
3. ✅ **Scalable** với Supabase và microservices-ready architecture
4. ✅ **Cost-effective** (1.8B VNĐ Year 1 vs 2.5B với Twenty CRM)
5. ✅ **Maintainable** với standard patterns và large community support
6. ✅ **Future-proof** với modern tech stack

**Next Steps**:
1. Setup Supabase project
2. Initialize NestJS + Next.js monorepo
3. Implement Epic 1 (Foundation)
4. Iterative development theo Epics 2-8

---

_Generated by Winston (BMAD Architect) for Luis_
_Date: 19/01/2026_
_Version: 2.0 (Custom Build)_
