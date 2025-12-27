# Public Marketplace Module

## Purpose

Public Marketplace for real estate listings - allows external users to browse, search, and post property listings on the Twenty CRM platform.

## Module Structure

```
packages/twenty-front/src/modules/public-marketplace/
├── components/       # React components (ListingCard, SearchFilters, etc.)
├── pages/           # Page components (Browse, Detail, Dashboard, etc.)
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
├── data/            # Mock data for development
├── utils/           # Utility functions
├── graphql/         # GraphQL queries/mutations (future)
├── index.ts         # Barrel export
└── README.md        # This file
```

## Key Components (To Be Implemented)

### Pages
- **BrowsePage**: Browse and search listings with filters
- **ListingDetailPage**: Detailed view of a single listing
- **RegisterPage**: User registration form
- **LoginPage**: User authentication
- **ProfilePage**: User profile management
- **DashboardPage**: Seller analytics dashboard
- **PostListingPage**: Create new listing form
- **InquiriesPage**: Manage buyer inquiries
- **PaymentPage**: Subscription plans and payment
- **ModerationPage**: Admin moderation queue (admin only)
- **RevenuePage**: Revenue tracking dashboard (admin only)

### Components
- **ListingCard**: Display listing summary
- **SearchFilters**: Search and filter controls
- **TrustScoreDisplay**: Show trust score with breakdown
- **InquiryForm**: Send inquiry to seller
- **SubscriptionPlanCard**: Display subscription plan details
- **AIChatbot**: Persistent AI assistant sidebar

## Types

See `types/index.ts` for complete type definitions:
- `PublicUser`: User account information
- `PublicListing`: Property listing data
- `Inquiry`: Buyer inquiry to seller
- `SubscriptionPlan`: Subscription tier details
- `Transaction`: Payment transaction
- `RevenueStats`: Revenue metrics (admin)
- `SellerStats`: Seller performance metrics

## Mock Data

Mock data is available in `data/mock-data.ts` for development:
- `mockPublicUsers`: Sample users with different subscription tiers
- `mockPublicListings`: Sample property listings
- `mockInquiries`: Sample buyer inquiries
- `mockSubscriptionPlans`: FREE, PRO, ENTERPRISE plans
- `mockTransactions`: Sample payment transactions
- `mockRevenueStats`: Revenue statistics
- `mockSellerStats`: Seller performance stats

## Environment Variables

SSR-related variables (to be added to root `.env` file):

```bash
# Public Marketplace - SSR Configuration
SSR_ENABLED=false           # Enable/disable SSR (default: false for dev)
SSR_PORT=3002              # SSR server port (default: 3002)
SSR_CACHE_TTL=3600         # Redis cache TTL in seconds (default: 1 hour)
```

## Integration with Twenty CRM

This module is integrated into the Twenty CRM frontend:
- Uses existing Twenty UI components (`twenty-ui` package)
- Follows Twenty's routing patterns
- Shares state management (Recoil)
- Uses Twenty's design system (Emotion CSS-in-JS)

## Development

### Running the Module

```bash
# Start development server
cd packages/twenty-front
yarn dev
```

### Adding New Components

1. Create component in `components/` directory
2. Export from `index.ts` if needed externally
3. Follow Twenty UI component patterns
4. Use TypeScript strict mode

### Adding New Pages

1. Create page component in `pages/` directory
2. Add route in `src/modules/app/hooks/useCreateAppRouter.tsx`
3. Add navigation item if needed

## References

- [Epic 8 Overview](../../../docs/real-estate-platform/epics.md#epic-8-public-marketplace)
- [UX Design Specification](../../../docs/ux-design-epic-8-public-marketplace.md)
- [Architecture Document](../../../docs/real-estate-platform/architecture.md)
- [PRD v1.4](../../../docs/real-estate-platform/prd-v1.3.md)

## Stories

This module implements Epic 8 stories:
- **Epic 8.1**: Foundation & SSR Setup (6 stories)
- **Epic 8.2**: Public User Management (5 stories)
- **Epic 8.3**: Public Listing Management (6 stories)
- **Epic 8.4**: AI Research & Trust System (5 stories)
- **Epic 8.5**: AI Summary & Spam Filter (4 stories)
- **Epic 8.6**: Inquiry & Lead Conversion (5 stories)
- **Epic 8.7**: Monetization & Analytics (4 stories)
- **Epic 8.8**: Advanced Features & Optimization (3 stories)

**Total**: 31 stories, estimated 248 hours

## Status

- ✅ Module structure created (Story 8.1.1)
- ⏳ SSR server setup (Story 8.1.2)
- ⏳ Components implementation (Stories 8.2-8.8)
