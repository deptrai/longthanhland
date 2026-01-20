# Quick Start Guide: Custom Build Implementation

**Project**: Real Estate Distribution Platform
**Stack**: NestJS + Next.js 14 + Supabase
**Timeline**: 5-7 months
**Cost**: 1.8B VNĐ Year 1

---

## Phase 1: Foundation (Month 1)

### Week 1-2: Project Setup

**1. Create Supabase Project**
```bash
# 1. Go to https://supabase.com
# 2. Create new project: "real-estate-platform"
# 3. Copy connection string and keys
# 4. Enable required extensions:
#    - pg_trgm (full-text search)
#    - postgis (geospatial data)
```

**2. Initialize Monorepo**
```bash
# Create project structure
pnpm create nx-workspace real-estate-platform --preset=apps
cd real-estate-platform

# Add NestJS app
pnpm nx g @nx/nest:app backend

# Add Next.js app
pnpm nx g @nx/next:app frontend

# Add shared library
pnpm nx g @nx/js:lib shared
```

**3. Setup Backend (NestJS)**
```bash
cd apps/backend

# Install dependencies
pnpm add @nestjs/config @nestjs/graphql @nestjs/apollo
pnpm add @prisma/client prisma
pnpm add @supabase/supabase-js
pnpm add bullmq ioredis
pnpm add class-validator class-transformer

# Initialize Prisma
npx prisma init

# Copy schema from architecture-custom-build.md Section 3.1
# Run migration
npx prisma migrate dev --name init
```

**4. Setup Frontend (Next.js)**
```bash
cd apps/frontend

# Install dependencies
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
pnpm add @tanstack/react-query
pnpm add zustand
pnpm add react-hook-form zod
pnpm add tailwindcss @tailwindcss/forms
pnpm add shadcn-ui

# Initialize Tailwind
npx tailwindcss init -p
```

### Week 3-4: Core Infrastructure

**1. Authentication Module**
```typescript
// apps/backend/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

**2. Supabase Integration**
```typescript
// apps/backend/src/config/supabase.config.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

**3. GraphQL Setup**
```typescript
// apps/backend/src/app.module.ts
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

---

## Phase 2: Internal CRM (Month 2-3)

### Epic 1: Foundation
- [x] Project setup
- [x] Database schema
- [x] Authentication
- [ ] RBAC implementation
- [ ] Deployment pipeline

### Epic 2: Property Management
- [ ] Projects CRUD
- [ ] Properties CRUD
- [ ] Reservation system (pessimistic locking)
- [ ] Auto-release job (BullMQ)
- [ ] Real-time updates (Supabase Realtime)

### Epic 3: Customer & Deals
- [ ] Contacts CRUD
- [ ] Deals CRUD
- [ ] Deal-Property status sync
- [ ] Auto-create commission trigger

### Epic 4: Sales Tools
- [ ] Sales dashboard
- [ ] Performance widgets
- [ ] Leaderboard
- [ ] My reserved properties

### Epic 5: Commission
- [ ] Auto-calculate commission
- [ ] Approval workflow
- [ ] Payment batch export
- [ ] Reports

---

## Phase 3: Public Marketplace (Month 4-6)

### Epic 8.1: SSR Foundation
```typescript
// apps/frontend/app/(public)/listings/[id]/page.tsx
export async function generateMetadata({ params }) {
  const listing = await getListingById(params.id);

  return {
    title: `${listing.title} - ${listing.location}`,
    description: listing.description.substring(0, 160),
    openGraph: {
      title: listing.title,
      images: [listing.imageUrls[0]],
    },
  };
}
```

### Epic 8.2: Public Users
- [ ] Registration & verification
- [ ] Authentication
- [ ] Subscription tiers
- [ ] Profile management

### Epic 8.3: Public Listings
- [ ] Listing CRUD
- [ ] Admin approval workflow
- [ ] Browse & search
- [ ] Listing detail (SSR)

### Epic 8.4: AI Features
```typescript
// packages/ai-functions/research-agent/index.ts
serve(async (req) => {
  const { listingId } = await req.json();

  // Research from multiple sources
  const results = await Promise.all([
    searchBatDongSan(listing),
    searchChoTot(listing),
  ]);

  // Calculate confidence score
  const confidenceScore = calculateConfidence(results);

  // Save to database
  await supabase.from('ai_research_results').insert({
    listing_id: listingId,
    confidence_score: confidenceScore,
  });
});
```

---

## Key Implementation Patterns

### 1. Reservation with Pessimistic Lock

```typescript
async reserveProperty(propertyId: string, userId: string) {
  return this.prisma.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
    });

    if (property.status !== 'AVAILABLE') {
      throw new BadRequestException('Not available');
    }

    const updated = await tx.property.update({
      where: { id: propertyId },
      data: {
        status: 'RESERVED',
        reservedById: userId,
        reservedUntil: addHours(new Date(), 24),
      },
    });

    // Schedule auto-release
    await this.queue.add('release', { propertyId }, {
      delay: 24 * 60 * 60 * 1000,
    });

    return updated;
  });
}
```

### 2. Next.js SSR for SEO

```typescript
// Server Component - Auto SSR
export default async function ListingPage({ params }) {
  const listing = await supabase
    .from('public_listings')
    .select('*')
    .eq('id', params.id)
    .single();

  return <ListingDetail listing={listing} />;
}
```

### 3. Supabase Row Level Security

```sql
-- Public can view approved listings
CREATE POLICY "view_approved_listings"
ON public_listings FOR SELECT
USING (status = 'APPROVED');

-- Owners can edit own listings
CREATE POLICY "edit_own_listings"
ON public_listings FOR UPDATE
USING (auth.uid() = owner_id);
```

---

## Deployment Checklist

### Backend (Dokploy)
- [ ] Create Dokploy project
- [ ] Configure environment variables
- [ ] Setup PostgreSQL connection
- [ ] Setup Redis
- [ ] Deploy NestJS app
- [ ] Configure Nginx reverse proxy

### Frontend (Vercel)
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Setup custom domain
- [ ] Enable Edge Network
- [ ] Configure build settings

### Supabase
- [ ] Enable Row Level Security
- [ ] Deploy Edge Functions
- [ ] Configure Storage buckets
- [ ] Setup Auth providers

---

## Testing Strategy

### Unit Tests
```bash
# Backend
cd apps/backend
pnpm test

# Frontend
cd apps/frontend
pnpm test
```

### E2E Tests
```bash
# Install Playwright
pnpm add -D @playwright/test

# Run E2E tests
pnpm test:e2e
```

### Critical Test Cases
1. Property reservation (double-booking prevention)
2. Auto-release after 24h
3. Commission auto-creation on deal won
4. Lead auto-assignment
5. Listing approval workflow
6. AI research agent
7. SSR meta tags generation

---

## Success Metrics

### Technical
- ✅ API response < 200ms
- ✅ SSR render < 500ms
- ✅ Lighthouse SEO > 90
- ✅ Cache hit rate > 80%
- ✅ Error rate < 0.1%

### Business
- ✅ 500 qualified leads/month by Month 12
- ✅ 5,000 public users Year 1
- ✅ 10-15% lead conversion
- ✅ Break-even Month 8-10

---

## Next Steps

1. **Week 1**: Setup Supabase project + monorepo
2. **Week 2**: Implement authentication + RBAC
3. **Week 3-4**: Epic 2 (Properties) + Epic 3 (Deals)
4. **Month 2**: Epic 4 (Sales Tools) + Epic 5 (Commission)
5. **Month 3**: Epic 6 (Leads) + Epic 7 (Operations)
6. **Month 4-6**: Epic 8 (Public Marketplace)
7. **Month 7**: Testing + Pilot program

---

## Resources

- **Architecture**: `/docs/real-estate-platform/architecture-custom-build.md`
- **PRD**: `/docs/real-estate-platform/prd-v1.4.md`
- **Epics**: `/docs/real-estate-platform/epics.md`
- **Evaluation**: Brain artifacts (implementation_plan.md)

---

_Generated by Winston (BMAD Architect) for Luis_
_Date: 19/01/2026_
