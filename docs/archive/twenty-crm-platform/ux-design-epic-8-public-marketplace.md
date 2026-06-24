# UX Design Specification: Epic 8 - Public Marketplace

**Version:** 1.0
**Date:** December 27, 2025
**Project:** Twenty CRM - Public Real Estate Marketplace
**Scope:** Epic 8 (31 stories across 7 sub-epics)

---

## Executive Summary

This UX design specification defines the complete user experience for the Public Marketplace feature of Twenty CRM, encompassing 31 stories across 7 sub-epics. The design leverages Twenty's existing design system (twenty-ui) built on Emotion CSS-in-JS with Radix UI colors, ensuring consistency with the core CRM platform while creating a distinct public-facing marketplace experience.

**⚠️ IMPORTANT: Integration Architecture**

Epic 8 Public Marketplace will be **integrated into the same codebase** as the existing Twenty CRM frontend (`/packages/twenty-front`), NOT a separate application. This means:

- **Shared Components**: Reuse existing `twenty-ui` components (buttons, inputs, modals, etc.)
- **Shared Routing**: Public marketplace routes (`/marketplace/*`) coexist with CRM routes (`/objects/*`, `/settings/*`)
- **Shared State Management**: Recoil state, Apollo Client, authentication context
- **Shared Build**: Single Vite build process, shared dependencies
- **Dual UX**: CRM users (internal) and Public users (external) in same app with different navigation/permissions

**Key Design Principles:**
- **Trust & Transparency**: AI-powered research and trust scores build confidence
- **Efficiency**: Streamlined flows minimize friction for buyers and sellers
- **Intelligence**: AI assistance throughout the journey (chatbot, summaries, spam detection)
- **Monetization**: Clear value proposition for premium features
- **Accessibility**: WCAG 2.1 AA compliance for inclusive experience
- **Consistency**: Leverage existing Twenty UI components while adapting for public-facing experience

---

## 1. Design System Foundation

### 1.1 Existing Twenty Design System

**Technology Stack:**
- **UI Library**: Custom `twenty-ui` package
- **Styling**: @emotion/styled + @emotion/react (CSS-in-JS)
- **Icons**: @tabler/icons-react (3.31.0)
- **Animation**: framer-motion (11.18.0)
- **Charts**: @nivo (bar, line, pie, radial-bar)
- **React**: 18.2.0 with TypeScript

**Component Architecture:**
```
twenty-ui/
├── accessibility/     # ARIA, keyboard navigation
├── components/        # Reusable UI components
├── display/          # Data display components
├── feedback/         # Toasts, alerts, notifications
├── input/            # Form inputs, selectors
├── layout/           # Grid, containers, spacing
├── navigation/       # Nav bars, breadcrumbs, tabs
├── theme/            # Colors, typography, spacing
└── utilities/        # Helper functions, hooks
```

### 1.2 Color Palette (Radix UI P3)

**Primary Colors (Light Mode):**
```typescript
// Main Brand Colors
blue: indigo9      // Primary actions, links
green: green9      // Success, positive actions
red: red9          // Errors, destructive actions
amber: amber9      // Warnings, alerts
gray: gray7        // Neutral, secondary text

// Semantic Colors
success: green9
warning: amber9
error: red9
info: sky9
```

**Grayscale:**
```typescript
gray0-gray12       // Full grayscale spectrum
alpha variants     // Transparent overlays
```

**[ASSUMPTION: Public Marketplace Color Strategy]**
For the public marketplace, we'll use:
- **Primary**: Blue (indigo9) - Trust, professionalism
- **Accent**: Turquoise (teal9) - Fresh, modern real estate
- **Success**: Green (green9) - Approved listings, positive actions
- **Warning**: Amber (amber9) - Pending approval, caution
- **Error**: Red (red9) - Rejected, errors
- **Featured**: Gold (gold9) - Premium featured listings

### 1.3 Typography

**Font Family:** Inter, sans-serif

**Type Scale:**
```typescript
xxs: 0.625rem (10px)  // Tiny labels, metadata
xs:  0.85rem  (13.6px) // Small text, captions
sm:  0.92rem  (14.7px) // Body small, secondary
md:  1rem     (16px)   // Body text (base)
lg:  1.23rem  (19.7px) // H3, subheadings
xl:  1.54rem  (24.6px) // H2, section titles
xxl: 1.85rem  (29.6px) // H1, page titles
```

**Font Weights:**
- Regular: 400 (body text)
- Medium: 500 (emphasis, labels)
- SemiBold: 600 (headings, buttons)

### 1.4 Spacing System

**Base Unit:** 4px (spacingMultiplicator: 4)

**Spacing Scale:**
```typescript
spacing(1)  = 4px    // Tight spacing
spacing(2)  = 8px    // Default gap
spacing(3)  = 12px   // Small margin
spacing(4)  = 16px   // Standard margin
spacing(6)  = 24px   // Section spacing
spacing(8)  = 32px   // Large spacing
spacing(12) = 48px   // Extra large spacing
spacing(16) = 64px   // Section dividers
```

**Component Spacing:**
- Between siblings gap: 2px
- Table horizontal cell margin: 8px
- Table horizontal cell padding: 8px
- Right drawer width: 500px

### 1.5 Responsive Breakpoints

**[ASSUMPTION: Responsive Strategy]**
```typescript
mobile:  < 768px    // Single column, bottom nav
tablet:  768-1024px // 2 columns, adapted nav
desktop: > 1024px   // Multi-column, sidebar nav
```

---

## 2. Epic 8 Overview & User Journeys

### 2.1 Sub-Epic Structure

**Epic 8.2: Public User Management (4 stories, 26h)**
- User registration & verification
- Authentication (login, password reset, 2FA)
- Subscription tiers & RBAC
- Profile management

**Epic 8.3: Public Listing Management (6 stories, 52h)**
- PublicListing entity & CRUD
- Post listing flow (multi-step)
- Admin approval workflow
- Listing status management
- Browse & search listings
- Listing detail page (SSR)

**Epic 8.4: AI Research & Trust System (5 stories, 36h)**
- AIResearchResult entity
- Perplexica API integration
- AI research processing
- Trust score calculation
- Display trust score & research results

**Epic 8.5: AI Summary & Spam Filter (4 stories, 30h)**
- OpenAI integration
- AI summary generation
- Spam detection & filtering
- Content moderation queue
- Display AI summary

**Epic 8.6: Inquiry & Lead Conversion (5 stories, 36h)**
- Inquiry entity & CRUD
- Inquiry form & notifications
- Lead conversion workflow
- Lead assignment to agents
- Inquiry management dashboard

**Epic 8.7: Monetization & Analytics (4 stories, 34h)**
- Subscription payment integration (VNPay)
- Featured listings feature
- Seller analytics dashboard
- Revenue tracking & reporting (admin)

**Epic 8.8: Advanced Features & Optimization (3 stories, 34h)**
- AI consultation chatbot
- Dynamic sitemap & structured data
- Performance optimization & monitoring

**Total:** 31 stories, 248 estimated hours

### 2.2 Primary User Personas

**1. Property Buyer (Public User - FREE tier)**
- **Goal**: Find trustworthy property listings quickly
- **Pain Points**: Scam listings, incomplete information, slow responses
- **Key Features**: Browse/search, AI research, trust scores, inquiry submission

**2. Property Seller (Public User - BASIC/PRO tier)**
- **Goal**: List properties and generate qualified leads
- **Pain Points**: Low visibility, spam inquiries, no analytics
- **Key Features**: Post listings, manage inquiries, view analytics, featured listings (PRO)

**3. Real Estate Agent (Internal CRM User)**
- **Goal**: Convert marketplace inquiries into deals
- **Pain Points**: Lead quality, response time, tracking
- **Key Features**: Lead assignment, inquiry dashboard, conversion tracking

**4. Admin/Moderator (Internal CRM User)**
- **Goal**: Maintain marketplace quality and safety
- **Pain Points**: Spam content, fraudulent listings, moderation workload
- **Key Features**: Approval workflow, content moderation, spam detection, revenue tracking

### 2.3 Critical User Journeys

**Journey 1: Browse & Discover Listings (Buyer)**
```
Entry → Browse Page → Filter/Search → Listing Card → Detail Page → Inquiry
```

**Journey 2: Post New Listing (Seller)**
```
Login → Dashboard → New Listing → Multi-step Form → Submit → Pending Approval → Approved → Live
```

**Journey 3: Inquiry & Lead Conversion (Buyer → Agent)**
```
Listing Detail → Inquiry Form → Submit → Agent Notification → Lead Created → Agent Response → Conversion
```

**Journey 4: Upgrade to PRO (Seller)**
```
Dashboard → View Analytics → See Limitations → Upgrade CTA → Select Plan → Payment (VNPay) → Confirmation → PRO Features Unlocked
```

**Journey 5: Feature Listing (PRO Seller)**
```
Dashboard → My Listings → Select Listing → Feature Button → Confirm (Quota Check) → Featured → Top of Search Results
```

---

## 3. Key Screen Designs

### 3.1 Public Homepage / Landing

**Purpose:** First impression, value proposition, drive engagement

**Layout:** Hero + Features + Listings Grid + CTA

**Components:**
```
┌─────────────────────────────────────────────┐
│ [Logo]              [Search Bar]    [Login] │ ← Navigation Bar
├─────────────────────────────────────────────┤
│                                             │
│         Find Your Dream Property            │ ← Hero Section
│         with AI-Powered Trust Scores        │
│                                             │
│    [Search Location] [Category ▼] [Search] │
│                                             │
├─────────────────────────────────────────────┤
│  🏠 Verified     🤖 AI Research   ⭐ Trust  │ ← Value Props
│  Listings       & Summaries       Scores    │
├─────────────────────────────────────────────┤
│                                             │
│  Featured Listings (Gold Badge)             │ ← Featured Section
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐              │
│  │ 🏠 │ │ 🏢 │ │ 🏡 │ │ 🏘️ │              │
│  └────┘ └────┘ └────┘ └────┘              │
│                                             │
├─────────────────────────────────────────────┤
│  Recent Listings                            │ ← Listings Grid
│  ┌────┐ ┌────┐ ┌────┐                      │
│  │    │ │    │ │    │                      │
│  └────┘ └────┘ └────┘                      │
│  ┌────┐ ┌────┐ ┌────┐                      │
│  │    │ │    │ │    │                      │
│  └────┘ └────┘ └────┘                      │
│                                             │
│  [View All Listings →]                      │
├─────────────────────────────────────────────┤
│  💬 AI Chatbot (Floating Button)           │ ← Chatbot Widget
└─────────────────────────────────────────────┘
```

**Design Decisions:**
- **Hero**: Large, inviting with clear value proposition
- **Search**: Prominent, 3-field search (location, category, keyword)
- **Featured Listings**: Gold badge, carousel, premium placement
- **Trust Indicators**: Icons for verified, AI research, trust scores
- **Chatbot**: Floating button bottom-right (blue, pulsing animation)

**Responsive:**
- Mobile: Single column, simplified search, bottom nav
- Tablet: 2-column grid, adapted hero
- Desktop: 3-4 column grid, full hero

### 3.2 Browse & Search Listings Page

**Purpose:** Help users find relevant properties efficiently

**Layout:** Filters Sidebar + Results Grid + Map (optional)

**Components:**
```
┌─────────────────────────────────────────────┐
│ [Logo]  [Search Bar]  [Login] [Post Listing]│ ← Nav Bar
├─────────────────────────────────────────────┤
│ Filters ▼    Sort: Relevance ▼   Map View □ │ ← Controls
├───────┬─────────────────────────────────────┤
│       │  Featured Listings (3 cards)        │ ← Featured
│ 📍    │  ┌──────┐ ┌──────┐ ┌──────┐        │
│ Loc   │  │⭐Gold│ │⭐Gold│ │⭐Gold│        │
│       │  └──────┘ └──────┘ └──────┘        │
│ 💰    ├─────────────────────────────────────┤
│ Price │  All Listings (Grid)                │ ← Regular
│       │  ┌──────┐ ┌──────┐ ┌──────┐        │
│ 🏠    │  │ 🏠   │ │ 🏢   │ │ 🏡   │        │
│ Type  │  │ Title│ │ Title│ │ Title│        │
│       │  │ Price│ │ Price│ │ Price│        │
│ 📊    │  │ 🔍AI │ │ 🔍AI │ │ 🔍AI │        │
│ Trust │  │ ⭐85%│ │ ⭐92%│ │ ⭐78%│        │
│       │  └──────┘ └──────┘ └──────┘        │
│ [Apply│  ┌──────┐ ┌──────┐ ┌──────┐        │
│ Filter│  │      │ │      │ │      │        │
│ ]     │  └──────┘ └──────┘ └──────┘        │
│       │                                     │
│       │  [Load More]                        │
└───────┴─────────────────────────────────────┘
```

**Filter Sidebar:**
- Location (autocomplete)
- Price range (slider)
- Property type (checkboxes)
- Trust score minimum (slider)
- Bedrooms/Bathrooms (dropdowns)
- Area size (range)
- Features (checkboxes)

**Listing Card:**
```
┌──────────────────────────┐
│ [Image Carousel]         │ ← 3-5 images, dots indicator
│ ⭐ Featured (if featured)│ ← Gold badge top-left
├──────────────────────────┤
│ Property Title           │ ← H3, semiBold
│ 📍 Location              │ ← Gray, small
│ 💰 3,500,000,000 VND     │ ← Large, blue, semiBold
├──────────────────────────┤
│ 🔍 AI Research Available │ ← Icon + text
│ ⭐ Trust Score: 85%      │ ← Progress bar, color-coded
├──────────────────────────┤
│ 🛏️ 3BR  🚿 2BA  📐 120m²│ ← Key specs
├──────────────────────────┤
│ [View Details →]         │ ← Primary button
└──────────────────────────┘
```

**Sort Options:**
- Relevance (default)
- Featured First
- Price: Low to High
- Price: High to Low
- Newest First
- Trust Score: High to Low

**Design Decisions:**
- **Featured Separation**: Clear visual distinction (gold badge, top placement)
- **Trust Score**: Prominent display with color coding (green >80%, amber 60-80%, red <60%)
- **AI Indicator**: Badge showing AI research available
- **Responsive**: Filters collapse to modal on mobile, 1-2-3 column grid

### 3.3 Listing Detail Page (SSR)

**Purpose:** Provide comprehensive property information, build trust, drive inquiries

**Layout:** Hero Images + Details + AI Research + Trust Score + Inquiry Form

**Components:**
```
┌─────────────────────────────────────────────┐
│ [Logo]  [Search]  [Login]  [Post Listing]  │ ← Nav + Breadcrumb
│ Home > Browse > Apartment > Listing Title   │
├─────────────────────────────────────────────┤
│                                             │
│  [Large Image Gallery]                      │ ← Hero Images
│  ← → (carousel)                             │   (lightbox on click)
│  ⭐ Featured (if applicable)                │
│                                             │
├─────────────────────────────────────────────┤
│ Property Title                    💰 Price  │ ← Title + Price
│ 📍 Full Address                             │
├──────────────────┬──────────────────────────┤
│                  │  ⭐ Trust Score: 85%     │ ← Trust Section
│  Property        │  ━━━━━━━━━━━━━━━━━━━━   │   (Prominent)
│  Details         │  🔍 AI Research Summary  │
│                  │  ━━━━━━━━━━━━━━━━━━━━   │
│  🛏️ Bedrooms: 3  │  ✓ Verified Information │
│  🚿 Bathrooms: 2 │  ✓ Market Price Check   │
│  📐 Area: 120m²  │  ✓ Location Analysis    │
│  🏗️ Year: 2020   │  ✓ Legal Status OK      │
│  🎨 Furnished    │  [View Full Report →]   │
│                  │                          │
│  Description     ├──────────────────────────┤
│  (Full text)     │  📞 Contact Seller       │ ← Inquiry Form
│                  │  ━━━━━━━━━━━━━━━━━━━━   │   (Sticky on scroll)
│  Features        │  Name: [________]        │
│  ✓ Parking       │  Email: [________]       │
│  ✓ Balcony       │  Phone: [________]       │
│  ✓ Security      │  Message: [________]     │
│                  │  [Send Inquiry]          │
│  Location Map    │                          │
│  [Google Maps]   │  Rate Limit: 3/10 today  │
│                  │                          │
├──────────────────┴──────────────────────────┤
│  AI-Generated Summary                       │ ← AI Summary
│  This property offers excellent value...    │   (Expandable)
│  [Read More]                                │
├─────────────────────────────────────────────┤
│  Similar Listings                           │ ← Recommendations
│  ┌──────┐ ┌──────┐ ┌──────┐                │
│  │      │ │      │ │      │                │
│  └──────┘ └──────┘ └──────┘                │
└─────────────────────────────────────────────┘
```

**Trust Score Display:**
```
┌──────────────────────────────────┐
│ ⭐ Trust Score: 85%              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Progress bar (green)
│                                  │
│ Based on AI Research:            │
│ ✓ Verified Information (95%)    │
│ ✓ Market Price Check (80%)      │
│ ✓ Location Analysis (90%)       │
│ ✓ Legal Status (OK)              │
│ ⚠ Minor concerns: 1              │
│                                  │
│ [View Detailed Report →]         │
│                                  │
│ Last updated: 2 hours ago        │
└──────────────────────────────────┘
```

**AI Research Modal (when clicked):**
```
┌─────────────────────────────────────────────┐
│ 🔍 AI Research Report          [✕ Close]    │
├─────────────────────────────────────────────┤
│                                             │
│ Trust Score Breakdown                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                             │
│ 1. Information Verification (95%)          │
│    ✓ All key details verified              │
│    ✓ Seller identity confirmed             │
│    ✓ Property ownership verified           │
│                                             │
│ 2. Market Price Analysis (80%)             │
│    • Listed price: 3,500,000,000 VND       │
│    • Market average: 3,200,000,000 VND     │
│    • Assessment: Slightly above market     │
│    • Sources: [Link] [Link] [Link]        │
│                                             │
│ 3. Location Analysis (90%)                 │
│    ✓ Good neighborhood                     │
│    ✓ Near schools, hospitals               │
│    ✓ Public transport access               │
│    ⚠ Traffic congestion during peak hours │
│                                             │
│ 4. Legal Status (OK)                       │
│    ✓ Clean title                           │
│    ✓ No disputes                           │
│    ✓ Zoning compliant                      │
│                                             │
│ Research Sources:                          │
│ • Perplexica AI Analysis                   │
│ • Public records database                  │
│ • Market data aggregators                  │
│                                             │
│ Generated: Dec 27, 2025, 9:00 PM           │
└─────────────────────────────────────────────┘
```

**Design Decisions:**
- **Trust Score**: Prominent placement, color-coded, expandable details
- **AI Summary**: Collapsible, clear attribution
- **Inquiry Form**: Sticky on scroll (desktop), always visible
- **Rate Limiting**: Clear indication (3/10 inquiries today)
- **Images**: Large hero gallery, lightbox, lazy loading
- **Responsive**: Single column on mobile, sticky inquiry form becomes bottom sheet

### 3.4 Seller Dashboard

**Purpose:** Central hub for sellers to manage listings, view analytics, upgrade

**Layout:** Stats Overview + Listings Table + Quick Actions

**Components:**
```
┌─────────────────────────────────────────────┐
│ [Logo]  Dashboard  Analytics  Settings  [👤]│ ← Nav Bar
├─────────────────────────────────────────────┤
│ Welcome back, John! 👋                      │ ← Greeting
│ Your subscription: PRO (Expires: Jan 15)    │
├─────────────────────────────────────────────┤
│ Overview (Last 30 days)                     │ ← Stats Cards
│ ┌──────────┬──────────┬──────────┬────────┐│
│ │ 📊 Views │ 📧 Inq.  │ ⭐ Conv. │ ⏱️ Resp││
│ │   1,234  │    45    │   12%    │  2.5h ││
│ │  +15% ↑  │  +8% ↑   │  -2% ↓   │ +0.5h│││
│ └──────────┴──────────┴──────────┴────────┘│
├─────────────────────────────────────────────┤
│ [+ New Listing]  [Feature Listing]  [...]  │ ← Quick Actions
├─────────────────────────────────────────────┤
│ My Listings (5 active, 2 pending)           │ ← Listings Table
│ ┌─────────────────────────────────────────┐│
│ │ Title      Status  Views  Inq.  Actions ││
│ ├─────────────────────────────────────────┤│
│ │ ⭐ Apt 3BR  LIVE    456    12    [⋮]    ││ ← Featured
│ │ House 4BR  LIVE    234     8    [⋮]    ││
│ │ Condo 2BR  PENDING  0      0    [⋮]    ││
│ │ Land Plot  LIVE    123     3    [⋮]    ││
│ │ Villa 5BR  EXPIRED 890    25    [⋮]    ││
│ └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│ Featured Listings Quota                     │ ← PRO Features
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Used: 3/5 this month                        │
│ Resets: Jan 1, 2026                         │
│ [Feature a Listing]                         │
└─────────────────────────────────────────────┘
```

**Stats Cards Design:**
```
┌──────────────────┐
│ 📊 Total Views   │ ← Icon + Label
│                  │
│     1,234        │ ← Large number
│                  │
│   +15% ↑         │ ← Trend indicator (green)
│   vs last month  │
└──────────────────┘
```

**Listing Row Actions Menu:**
```
[⋮] → ┌──────────────┐
      │ ✏️ Edit       │
      │ ⭐ Feature    │ (if PRO and quota available)
      │ 📊 Analytics  │
      │ 🗑️ Delete     │
      └──────────────┘
```

**Design Decisions:**
- **Stats**: Clear metrics with trend indicators
- **Quick Actions**: Prominent CTAs for common tasks
- **Table**: Sortable, filterable, actions menu
- **Featured Badge**: Gold star on featured listings
- **Quota Display**: Clear indication of PRO feature usage
- **Responsive**: Cards stack on mobile, table becomes cards

### 3.5 Post Listing Flow (Multi-step)

**Purpose:** Guide sellers through listing creation with validation

**Layout:** Stepper + Form Sections + Progress

**Steps:**
1. Basic Information
2. Property Details
3. Images & Media
4. Location & Map
5. Review & Submit

**Step 1: Basic Information**
```
┌─────────────────────────────────────────────┐
│ Create New Listing                          │
├─────────────────────────────────────────────┤
│ Progress: ●━━━━━ 1/5                        │ ← Stepper
│           Basic Details                      │
├─────────────────────────────────────────────┤
│                                             │
│ Property Title *                            │
│ [_________________________________]         │
│ e.g., "Modern 3BR Apartment in District 7" │
│                                             │
│ Category *                                  │
│ ○ Apartment  ○ House  ○ Land  ○ Commercial │
│                                             │
│ Listing Type *                              │
│ ○ For Sale   ○ For Rent                    │
│                                             │
│ Price (VND) *                               │
│ [_________________________________]         │
│                                             │
│ Description *                               │
│ [_________________________________]         │
│ [_________________________________]         │
│ [_________________________________]         │
│ Min 100 characters (0/100)                  │
│                                             │
│         [Cancel]  [Save Draft]  [Next →]   │
└─────────────────────────────────────────────┘
```

**Step 2: Property Details**
```
┌─────────────────────────────────────────────┐
│ Create New Listing                          │
├─────────────────────────────────────────────┤
│ Progress: ●●━━━━ 2/5                        │
│           Property Details                   │
├─────────────────────────────────────────────┤
│                                             │
│ Bedrooms *        Bathrooms *               │
│ [▼ 3]             [▼ 2]                     │
│                                             │
│ Area (m²) *       Year Built                │
│ [_______]         [_______]                 │
│                                             │
│ Furnishing Status *                         │
│ ○ Fully Furnished  ○ Partially  ○ Unfurnished│
│                                             │
│ Features (select all that apply)            │
│ ☑ Parking         ☑ Balcony                │
│ ☑ Security        ☐ Swimming Pool          │
│ ☐ Gym             ☐ Garden                 │
│                                             │
│ Legal Status *                              │
│ ○ Clean Title  ○ Under Mortgage  ○ Other   │
│                                             │
│      [← Back]  [Save Draft]  [Next →]      │
└─────────────────────────────────────────────┘
```

**Step 3: Images & Media**
```
┌─────────────────────────────────────────────┐
│ Create New Listing                          │
├─────────────────────────────────────────────┤
│ Progress: ●●●━━━ 3/5                        │
│           Images & Media                     │
├─────────────────────────────────────────────┤
│                                             │
│ Upload Images * (Min 3, Max 10)             │
│ ┌─────────────────────────────────────────┐│
│ │  Drag & drop images here                ││
│ │  or [Browse Files]                      ││
│ │                                         ││
│ │  Supported: JPG, PNG (Max 5MB each)    ││
│ └─────────────────────────────────────────┘│
│                                             │
│ Uploaded Images (3/10)                      │
│ ┌──────┐ ┌──────┐ ┌──────┐                │
│ │ [Img]│ │ [Img]│ │ [Img]│                │
│ │ [✕]  │ │ [✕]  │ │ [✕]  │                │
│ │⭐Main│ │      │ │      │                │
│ └──────┘ └──────┘ └──────┘                │
│                                             │
│ Video Tour (Optional)                       │
│ [Paste YouTube/Vimeo URL]                  │
│                                             │
│ Virtual Tour Link (Optional)                │
│ [Paste 360° tour URL]                      │
│                                             │
│      [← Back]  [Save Draft]  [Next →]      │
└─────────────────────────────────────────────┘
```

**Step 4: Location & Map**
```
┌─────────────────────────────────────────────┐
│ Create New Listing                          │
├─────────────────────────────────────────────┤
│ Progress: ●●●●━━ 4/5                        │
│           Location & Map                     │
├─────────────────────────────────────────────┤
│                                             │
│ Address *                                   │
│ [_________________________________]         │
│                                             │
│ City *            District *                │
│ [▼ Ho Chi Minh]   [▼ District 7]           │
│                                             │
│ Ward              Postal Code               │
│ [▼ Tan Phu]       [_______]                │
│                                             │
│ Map Location *                              │
│ ┌─────────────────────────────────────────┐│
│ │                                         ││
│ │     [Interactive Google Map]            ││
│ │     📍 Drag pin to exact location       ││
│ │                                         ││
│ └─────────────────────────────────────────┘│
│ Lat: 10.7769, Lng: 106.7009                │
│                                             │
│ Nearby Amenities (Auto-detected)           │
│ 🏫 Schools: 3 within 1km                   │
│ 🏥 Hospitals: 2 within 2km                 │
│ 🚇 Metro: 500m                             │
│                                             │
│      [← Back]  [Save Draft]  [Next →]      │
└─────────────────────────────────────────────┘
```

**Step 5: Review & Submit**
```
┌─────────────────────────────────────────────┐
│ Create New Listing                          │
├─────────────────────────────────────────────┤
│ Progress: ●●●●●━ 5/5                        │
│           Review & Submit                    │
├─────────────────────────────────────────────┤
│                                             │
│ Review Your Listing                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                             │
│ [Preview Card]                              │
│ ┌─────────────────────────────────────────┐│
│ │ [Main Image]                            ││
│ │ Modern 3BR Apartment in District 7      ││
│ │ 📍 Tan Phu Ward, District 7             ││
│ │ 💰 3,500,000,000 VND                    ││
│ │ 🛏️ 3BR  🚿 2BA  📐 120m²                ││
│ └─────────────────────────────────────────┘│
│                                             │
│ [Edit Basic Info]  [Edit Details]          │
│ [Edit Images]      [Edit Location]         │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                             │
│ ☑ I confirm all information is accurate    │
│ ☑ I have legal right to list this property │
│ ☑ I agree to Terms of Service              │
│                                             │
│ ⚠️ Your listing will be reviewed by our    │
│    team within 24 hours. You'll receive    │
│    an email notification once approved.     │
│                                             │
│      [← Back]  [Save as Draft]             │
│                       [Submit for Review →] │
└─────────────────────────────────────────────┘
```

**Design Decisions:**
- **Stepper**: Clear progress indicator (●●●━━━)
- **Validation**: Real-time inline validation
- **Save Draft**: Available at every step
- **Preview**: Live preview in final step
- **Required Fields**: Marked with asterisk (*)
- **Help Text**: Contextual guidance for each field
- **Responsive**: Single column on mobile, optimized inputs

---

## 4. Component Specifications

### 4.1 Listing Card Component

**Variants:**
- Standard (browse page)
- Featured (gold badge, premium styling)
- Compact (similar listings)

**States:**
- Default
- Hover (lift effect, shadow)
- Loading (skeleton)
- Error (placeholder image)

**Props:**
```typescript
interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    price: number;
    location: string;
    images: string[];
    category: 'apartment' | 'house' | 'land' | 'commercial';
    bedrooms?: number;
    bathrooms?: number;
    area: number;
    trustScore: number;
    hasAIResearch: boolean;
    isFeatured: boolean;
  };
  variant?: 'standard' | 'featured' | 'compact';
  onClick?: () => void;
}
```

**Styling:**
```typescript
const ListingCard = styled.div`
  background: ${({ theme }) => theme.background.primary};
  border: 1px solid ${({ theme }) => theme.border.color.medium};
  border-radius: ${({ theme }) => theme.spacing(2)};
  overflow: hidden;
  transition: ${({ theme }) => theme.clickableElementBackgroundTransition};

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.boxShadow.strong};
  }

  ${({ variant }) => variant === 'featured' && css`
    border: 2px solid ${({ theme }) => theme.color.gold};
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
  `}
`;
```

### 4.2 Trust Score Component

**Purpose:** Display trust score with visual indicator

**Props:**
```typescript
interface TrustScoreProps {
  score: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onDetailsClick?: () => void;
}
```

**Visual Design:**
```
┌──────────────────────────────┐
│ ⭐ Trust Score: 85%          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← Progress bar
│ [View Details →]             │
└──────────────────────────────┘
```

**Color Coding:**
- 80-100%: Green (success)
- 60-79%: Amber (warning)
- 0-59%: Red (error)

**Styling:**
```typescript
const TrustScoreBar = styled.div<{ score: number }>`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.background.tertiary};
  border-radius: 4px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${({ score }) => score}%;
    height: 100%;
    background: ${({ score, theme }) =>
      score >= 80 ? theme.color.green :
      score >= 60 ? theme.color.amber :
      theme.color.red
    };
    transition: width 0.3s ease;
  }
`;
```

### 4.3 AI Chatbot Widget

**Purpose:** Provide instant AI assistance

**States:**
- Collapsed (floating button)
- Expanded (chat interface)
- Loading (thinking animation)

**Layout (Expanded):**
```
┌──────────────────────────────┐
│ 🤖 AI Assistant      [─] [✕] │ ← Header
├──────────────────────────────┤
│ Xin chào! Tôi có thể giúp   │ ← Messages
│ gì cho bạn?                  │   (scrollable)
│                              │
│ [Suggested Questions]        │
│ • Tìm căn hộ dưới 3 tỷ      │
│ • Giá nhà ở Thủ Đức?        │
│ • Quy trình mua nhà?         │
│                              │
├──────────────────────────────┤
│ [Type your question...]  [→] │ ← Input
└──────────────────────────────┘
```

**Props:**
```typescript
interface ChatbotWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  initialMessage?: string;
  suggestedQuestions?: string[];
  maxMessages?: number; // Rate limit: 20/session
}
```

**Design Decisions:**
- **Position**: Bottom-right (default), 24px from edges
- **Animation**: Pulsing blue dot when collapsed
- **Rate Limit**: Show "20 messages remaining" counter
- **Fallback**: Contact form if AI fails
- **Vietnamese**: Primary language support

### 4.4 Inquiry Form Component

**Purpose:** Capture lead information

**Props:**
```typescript
interface InquiryFormProps {
  listingId: string;
  listingTitle: string;
  onSubmit: (data: InquiryData) => Promise<void>;
  rateLimit: {
    used: number;
    max: number;
    resetDate: Date;
  };
}
```

**Layout:**
```
┌──────────────────────────────┐
│ 📞 Contact Seller            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                              │
│ Name *                       │
│ [____________________]       │
│                              │
│ Email *                      │
│ [____________________]       │
│                              │
│ Phone *                      │
│ [____________________]       │
│                              │
│ Message *                    │
│ [____________________]       │
│ [____________________]       │
│                              │
│ ☑ I agree to be contacted   │
│                              │
│ [Send Inquiry]               │
│                              │
│ Rate limit: 3/10 today       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━ │
└──────────────────────────────┘
```

**Validation:**
- Name: Required, min 2 chars
- Email: Required, valid format
- Phone: Required, Vietnamese format
- Message: Required, min 20 chars
- Rate limit: Max 10 inquiries/day

**Design Decisions:**
- **Sticky**: Stays visible on scroll (desktop)
- **Rate Limit**: Clear indication, prevent spam
- **Pre-fill**: Auto-fill if user logged in
- **Success**: Toast notification + email confirmation

---

## 5. UX Patterns & Consistency

### 5.1 Button Hierarchy

**Primary Action:**
```typescript
<PrimaryButton>
  Submit for Review
</PrimaryButton>
```
- Style: Blue background, white text, semiBold
- Usage: Main CTA, form submissions
- Hover: Darker blue, lift effect

**Secondary Action:**
```typescript
<SecondaryButton>
  Save Draft
</SecondaryButton>
```
- Style: Transparent background, blue border, blue text
- Usage: Alternative actions, cancel
- Hover: Light blue background

**Tertiary Action:**
```typescript
<TertiaryButton>
  View Details
</TertiaryButton>
```
- Style: Transparent, no border, blue text
- Usage: Links, less important actions
- Hover: Underline

**Destructive Action:**
```typescript
<DestructiveButton>
  Delete Listing
</DestructiveButton>
```
- Style: Red background, white text
- Usage: Delete, remove, irreversible actions
- Confirmation: Always require confirmation modal

### 5.2 Feedback Patterns

**Success:**
- Pattern: Toast notification (top-right, 3s auto-dismiss)
- Color: Green background, white text
- Icon: ✓ checkmark
- Example: "Listing submitted successfully!"

**Error:**
- Pattern: Inline + Toast
- Color: Red background, white text
- Icon: ✕ error
- Example: "Failed to upload image. Please try again."

**Warning:**
- Pattern: Inline banner
- Color: Amber background, dark text
- Icon: ⚠ warning
- Example: "Your listing will expire in 3 days."

**Info:**
- Pattern: Inline banner or tooltip
- Color: Blue background, white text
- Icon: ℹ info
- Example: "PRO users get priority support."

**Loading:**
- Pattern: Skeleton screens (preferred) or spinner
- Usage: Data fetching, image loading
- Style: Animated gradient shimmer

### 5.3 Form Patterns

**Label Position:** Above input (always)

**Required Field Indicator:** Asterisk (*) after label

**Validation Timing:**
- onBlur: Check field when user leaves
- onChange: Real-time for password strength, character count
- onSubmit: Final validation before submission

**Error Display:**
- Inline: Below input field, red text, icon
- Summary: Top of form for multiple errors

**Help Text:**
- Caption: Below input, gray text
- Tooltip: Icon with hover/click

**Example:**
```
Label *
[Input Field]
Help text or error message
```

### 5.4 Modal Patterns

**Size Variants:**
- Small: 400px (confirmations)
- Medium: 600px (forms)
- Large: 800px (content)
- Full: 90vw (galleries)

**Dismiss Behavior:**
- Click outside: Yes (default)
- Escape key: Yes
- Explicit close button: Always present

**Focus Management:**
- Auto-focus: First input field
- Trap focus: Within modal
- Return focus: To trigger element on close

**Stacking:**
- Max 2 modals: Confirmation over form
- Z-index: Incremental (2000, 2001, etc.)

### 5.5 Navigation Patterns

**Active State:**
- Indicator: Blue underline or background
- Font weight: SemiBold
- Color: Blue (primary)

**Breadcrumbs:**
- Usage: Detail pages, nested sections
- Format: Home > Category > Item
- Last item: Not clickable (current page)

**Back Button:**
- Browser back: Supported (SSR)
- App back: Breadcrumb navigation
- Confirmation: If unsaved changes

**Deep Linking:**
- All pages: Shareable URLs
- State: Preserved in URL params
- Example: `/browse?category=apartment&price=0-3000000000`

### 5.6 Empty State Patterns

**First Use:**
```
┌──────────────────────────────┐
│     🏠                       │
│  No listings yet             │
│                              │
│  Create your first listing   │
│  to start generating leads   │
│                              │
│  [+ Create Listing]          │
└──────────────────────────────┘
```

**No Results:**
```
┌──────────────────────────────┐
│     🔍                       │
│  No listings found           │
│                              │
│  Try adjusting your filters  │
│  or search terms             │
│                              │
│  [Clear Filters]             │
└──────────────────────────────┘
```

**Cleared Content:**
```
┌──────────────────────────────┐
│     🗑️                       │
│  Listing deleted             │
│                              │
│  [Undo]  [Dismiss]           │
└──────────────────────────────┘
```

### 5.7 Confirmation Patterns

**Delete:**
- Always confirm: Modal with explicit action
- Undo option: 5 seconds after deletion
- Permanent: Clear warning for irreversible

**Leave Unsaved:**
- Warn: If form has changes
- Options: Save, Discard, Cancel
- Auto-save: Draft every 30 seconds

**Irreversible Actions:**
- Confirmation level: High
- Require: Type confirmation text
- Example: "Type DELETE to confirm"

### 5.8 Notification Patterns

**Placement:** Top-right corner

**Duration:**
- Success: 3s auto-dismiss
- Error: Manual dismiss
- Warning: 5s auto-dismiss
- Info: 3s auto-dismiss

**Stacking:** Vertical stack, max 3 visible

**Priority Levels:**
- Critical: Red, sound, no auto-dismiss
- Important: Amber, 5s
- Info: Blue, 3s

### 5.9 Search Patterns

**Trigger:**
- Auto: After 300ms debounce
- Manual: Enter key or search button

**Results Display:**
- Instant: Show results as user types
- Pagination: Load more on scroll

**Filters:**
- Placement: Sidebar (desktop), modal (mobile)
- Apply: Real-time or manual "Apply Filters"

**No Results:**
- Suggestions: "Did you mean...?"
- Alternative: "Try these popular searches"

### 5.10 Date/Time Patterns

**Format:**
- Relative: "2 hours ago", "3 days ago"
- Absolute: "Dec 27, 2025, 9:00 PM"
- Threshold: Relative < 7 days, then absolute

**Timezone:**
- User local: Always display in user's timezone
- Conversion: Automatic from UTC

**Pickers:**
- Calendar: Date selection
- Dropdown: Time selection
- Format: YYYY-MM-DD HH:mm

---

## 6. Responsive Strategy

### 6.1 Breakpoints

```typescript
const BREAKPOINTS = {
  mobile: '< 768px',
  tablet: '768px - 1024px',
  desktop: '> 1024px',
};
```

### 6.2 Adaptation Patterns

**Navigation:**
- Mobile: Bottom nav (5 icons max)
- Tablet: Top nav, collapsed menu
- Desktop: Top nav, full menu + sidebar

**Sidebar:**
- Mobile: Hidden, modal on demand
- Tablet: Collapsible, icon-only
- Desktop: Always visible, full width

**Cards/Lists:**
- Mobile: Single column, full width
- Tablet: 2 columns, grid
- Desktop: 3-4 columns, grid

**Tables:**
- Mobile: Card view (stacked)
- Tablet: Horizontal scroll
- Desktop: Full table

**Modals:**
- Mobile: Full screen (bottom sheet)
- Tablet: 80% width, centered
- Desktop: Fixed width, centered

**Forms:**
- Mobile: Single column, full width inputs
- Tablet: 2 columns where appropriate
- Desktop: Multi-column, optimized layout

### 6.3 Touch Targets

**Minimum Size:** 44x44px (iOS), 48x48px (Android)

**Spacing:** 8px between targets

**Hover States:** Disabled on touch devices

**Gestures:**
- Swipe: Image carousels, dismiss notifications
- Pinch: Zoom images, maps
- Long press: Context menu, drag

---

## 7. Accessibility Strategy

### 7.1 WCAG 2.1 Level AA Compliance

**Target:** WCAG 2.1 Level AA (legally required for public sites)

### 7.2 Key Requirements

**Color Contrast:**
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

**Keyboard Navigation:**
- Tab order: Logical, sequential
- Focus indicators: Visible (2px blue outline)
- Skip links: "Skip to main content"
- Shortcuts: Documented, customizable

**ARIA Labels:**
- Buttons: Descriptive labels
- Icons: aria-label for icon-only buttons
- Forms: Proper label associations
- Landmarks: nav, main, aside, footer

**Alt Text:**
- Images: Descriptive alt text
- Decorative: Empty alt=""
- Complex: Detailed description

**Form Labels:**
- Association: <label for="id">
- Required: aria-required="true"
- Errors: aria-invalid="true", aria-describedby

**Error Identification:**
- Clear: Describe what went wrong
- Suggestions: How to fix
- Color: Not the only indicator

**Touch Target Size:**
- Mobile: 48x48px minimum
- Desktop: 44x44px minimum

### 7.3 Testing Strategy

**Automated:**
- Lighthouse: Run on every build
- axe DevTools: Component testing
- WAVE: Page-level scanning

**Manual:**
- Keyboard-only: Complete flows
- Screen reader: NVDA (Windows), VoiceOver (Mac/iOS)
- Color blindness: Simulate protanopia, deuteranopia

**Tools:**
```bash
# Lighthouse CI
npm run lighthouse

# axe DevTools
npm run test:a11y

# Manual testing checklist
- [ ] Tab through all interactive elements
- [ ] Screen reader announces all content
- [ ] Color contrast passes (4.5:1)
- [ ] Forms have proper labels
- [ ] Errors are clearly identified
```

---

## 8. Performance Targets

### 8.1 Metrics

**SSR Render:** < 500ms (P95)
**API Response:** < 200ms (P95)
**Lighthouse SEO:** > 90
**Page Load:** < 2s (P75)
**Cache Hit Rate:** > 80%

### 8.2 Optimization Strategies

**Database:**
- Indexes on frequently queried fields
- Query optimization (EXPLAIN ANALYZE)
- Connection pooling

**Caching:**
- Multi-level: Memory + Redis
- TTL: 1 hour (dashboard), 24 hours (sitemap)
- Invalidation: On data updates

**Images:**
- Format: WebP (fallback to JPEG)
- Optimization: Sharp library
- Lazy loading: Below fold
- Responsive: srcset for different sizes

**Code Splitting:**
- React.lazy() for large components
- Route-based splitting
- Vendor bundle separation

**CDN:**
- Static assets: CloudFlare
- Images: CDN with optimization
- Caching: Aggressive for static files

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- Epic 8.2: User Management (4 stories, 26h)
- Epic 8.3: Listing Management (6 stories, 52h)
- **Deliverables:** Registration, authentication, post listing, browse/search

### Phase 2: Intelligence (Weeks 5-8)
- Epic 8.4: AI Research & Trust (5 stories, 36h)
- Epic 8.5: AI Summary & Spam (4 stories, 30h)
- **Deliverables:** Trust scores, AI summaries, spam detection

### Phase 3: Conversion (Weeks 9-12)
- Epic 8.6: Inquiry & Lead (5 stories, 36h)
- **Deliverables:** Inquiry forms, lead conversion, agent dashboard

### Phase 4: Monetization (Weeks 13-16)
- Epic 8.7: Monetization & Analytics (4 stories, 34h)
- Epic 8.8: Advanced Features (3 stories, 34h)
- **Deliverables:** Payments, featured listings, analytics, chatbot, optimization

---

## 10. Design Deliverables

### 10.1 Documentation
- ✅ This UX Design Specification
- 🔄 Component Library Documentation (in progress)
- 🔄 Accessibility Guidelines (in progress)

### 10.2 Visual Assets
- 🔄 HTML Mockups (to be generated)
- 🔄 Interactive Prototypes (to be generated)
- 🔄 Component Showcase (to be generated)

### 10.3 Developer Handoff
- Component specifications with props
- Styling guidelines (Emotion CSS-in-JS)
- Accessibility requirements
- Performance budgets

---

## 11. Success Metrics

### 11.1 User Experience Metrics

**Engagement:**
- Time on site: > 5 minutes average
- Pages per session: > 3 pages
- Bounce rate: < 40%

**Conversion:**
- Inquiry submission rate: > 10%
- Listing approval rate: > 85%
- PRO upgrade rate: > 5%

**Satisfaction:**
- Trust score visibility: > 90% view rate
- AI chatbot usage: > 20% of sessions
- Feature listing adoption: > 30% of PRO users

### 11.2 Technical Metrics

**Performance:**
- Lighthouse SEO: > 90
- Core Web Vitals: All green
- API response time: < 200ms P95

**Accessibility:**
- WCAG 2.1 AA: 100% compliance
- Keyboard navigation: All flows accessible
- Screen reader: No critical issues

**Quality:**
- Spam detection rate: > 95%
- Trust score accuracy: > 85%
- Uptime: > 99.9%

---

## Appendix A: Component Inventory

**From twenty-ui package:**
- Button (Primary, Secondary, Tertiary, Destructive)
- Input (Text, Number, Email, Phone, Textarea)
- Select (Dropdown, Multi-select)
- Checkbox, Radio
- Modal (Small, Medium, Large, Full)
- Toast (Success, Error, Warning, Info)
- Card, Badge, Tag
- Table (Sortable, Filterable)
- Tabs, Breadcrumbs
- Skeleton Loader
- Progress Bar
- Avatar, Icon
- Tooltip, Popover

**Custom Components for Epic 8:**
- ListingCard (Standard, Featured, Compact)
- TrustScore (with progress bar, color-coded)
- AIResearchModal (detailed report)
- InquiryForm (with rate limiting)
- ChatbotWidget (floating, expandable)
- FeatureListingButton (with quota display)
- AnalyticsDashboard (charts, metrics)
- ListingGallery (carousel, lightbox)
- SearchFilters (sidebar, modal)
- SubscriptionPlanCard (pricing, features)

---

## Appendix B: Color Reference

**Light Mode (Primary):**
```typescript
// Brand Colors
primary: indigo9      // #3E63DD
accent: teal9         // #12A594
success: green9       // #30A46C
warning: amber9       // #FFB224
error: red9           // #E5484D
featured: gold9       // #978365

// Grayscale
gray0: #FCFCFC
gray1: #F9F9F9
gray2: #F0F0F0
gray3: #E8E8E8
gray4: #E0E0E0
gray5: #D9D9D9
gray6: #CECECE
gray7: #BBBBBB
gray8: #8D8D8D
gray9: #838383
gray10: #646464
gray11: #202020
gray12: #161616
```

**Dark Mode (if implemented):**
```typescript
// Brand Colors (adjusted for dark)
primary: indigo9      // Slightly brighter
accent: teal9
success: green9
warning: amber9
error: red9
featured: gold9

// Grayscale (inverted)
gray0: #161616
gray1: #202020
// ... (inverted scale)
gray12: #FCFCFC
```

---

## Appendix C: Typography Reference

**Heading Styles:**
```typescript
H1: {
  fontSize: '1.85rem',
  fontWeight: 600,
  lineHeight: 1.2,
  letterSpacing: '-0.02em',
}

H2: {
  fontSize: '1.54rem',
  fontWeight: 600,
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
}

H3: {
  fontSize: '1.23rem',
  fontWeight: 600,
  lineHeight: 1.4,
}

Body: {
  fontSize: '1rem',
  fontWeight: 400,
  lineHeight: 1.5,
}

Small: {
  fontSize: '0.92rem',
  fontWeight: 400,
  lineHeight: 1.5,
}

Caption: {
  fontSize: '0.85rem',
  fontWeight: 400,
  lineHeight: 1.4,
  color: gray8,
}
```

---

## Appendix D: Animation Reference

**Transitions:**
```typescript
// From THEME_COMMON
clickableElementBackgroundTransition: 'background 0.1s ease'

// Custom animations
fadeIn: 'opacity 0.2s ease-in'
slideUp: 'transform 0.3s ease-out'
scaleIn: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
```

**Framer Motion Variants:**
```typescript
// Card hover
cardHover: {
  y: -4,
  transition: { duration: 0.2 }
}

// Modal enter/exit
modalVariants: {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 }
}

// Toast slide in
toastVariants: {
  hidden: { x: 400, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: 400, opacity: 0 }
}
```

---

**End of UX Design Specification**

**Next Steps:**
1. Generate HTML mockups for key screens
2. Create interactive prototypes for critical user flows
3. Validate with stakeholders
4. Hand off to development team

**Document Version:** 1.0
**Last Updated:** December 27, 2025
**Author:** Sally (UX Designer)
**Status:** Complete - Ready for Mockup Generation
