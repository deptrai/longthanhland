# Story 8.1.5: Dynamic Meta Tags Generation

Status: drafted

## Story

As a developer,
I want to generate dynamic meta tags for each listing page,
so that search engines and social media platforms display rich previews.

## Acceptance Criteria

1. **Meta Tags Generator Module Created**
   - Given SSR rendering working (Story 8.1.4)
   - When listing page rendered for bot
   - Then meta tags generator module exists at `server/utils/meta-tags-generator.ts`
   - And module exports `generateMetaTags(data)` function

2. **Listing Page Meta Tags**
   - Given listing data available
   - When meta tags generated for listing page
   - Then HTML includes:
     - `<title>` with format: "{title} - {location} | Public Marketplace"
     - `<meta name="description">` (max 160 chars, listing summary)
     - `<link rel="canonical">` with absolute URL
     - `<meta name="robots" content="index, follow">`

3. **Open Graph Tags**
   - Given listing page rendered
   - When OG tags generated
   - Then HTML includes:
     - `og:title` (listing title)
     - `og:description` (listing description, max 200 chars)
     - `og:image` (first listing image, absolute URL)
     - `og:url` (canonical URL)
     - `og:type` = "website"
     - `og:site_name` = "Public Marketplace"
     - `og:locale` = "vi_VN"

4. **Twitter Card Tags**
   - Given listing page rendered
   - When Twitter Card tags generated
   - Then HTML includes:
     - `twitter:card` = "summary_large_image"
     - `twitter:title` (listing title)
     - `twitter:description` (listing description)
     - `twitter:image` (first listing image)

5. **Structured Data (JSON-LD)**
   - Given listing page rendered
   - When structured data generated
   - Then HTML includes `<script type="application/ld+json">` with:
     - `@type` = "RealEstateListing"
     - Property details (name, description, price, address)
     - Images array
     - Seller information
     - Valid Schema.org format

6. **Default Meta Tags for Other Pages**
   - Given homepage or browse pages rendered
   - When meta tags generated
   - Then default meta tags used:
     - Generic title and description
     - Default OG image
     - Appropriate canonical URLs

7. **Special Character Escaping**
   - Given meta tag content has special characters
   - When tags generated
   - Then HTML entities escaped correctly:
     - `<` → `&lt;`
     - `>` → `&gt;`
     - `"` → `&quot;`
     - `&` → `&amp;`

8. **Image URL Handling**
   - Given images in meta tags
   - When URLs generated
   - Then absolute URLs used (with domain)
   - And images optimized for social sharing (1200x630 recommended)

## Tasks / Subtasks

- [ ] **Task 1: Create Meta Tags Generator Module** (AC: #1)
  - [ ] Create `packages/twenty-front/server/utils/meta-tags-generator.ts`
  - [ ] Define `MetaTagsData` interface
  - [ ] Create `generateMetaTags(data)` function
  - [ ] Export module

- [ ] **Task 2: Implement Basic Meta Tags** (AC: #2)
  - [ ] Generate `<title>` tag:
    - Format: "{title} - {location} | Public Marketplace"
    - Max length: 60 characters
    - Truncate if needed
  - [ ] Generate `<meta name="description">`:
    - Extract from listing description
    - Max length: 160 characters
    - Truncate with "..." if needed
  - [ ] Generate canonical URL:
    - Format: `https://domain.com/listings/{id}`
    - Use environment variable for domain
  - [ ] Add robots meta tag

- [ ] **Task 3: Implement Open Graph Tags** (AC: #3)
  - [ ] Generate OG tags:
    - `og:title` (listing title)
    - `og:description` (listing description, max 200 chars)
    - `og:image` (first image, absolute URL)
    - `og:url` (canonical URL)
    - `og:type` = "website"
    - `og:site_name` = "Public Marketplace"
    - `og:locale` = "vi_VN"
  - [ ] Format as HTML meta tags

- [ ] **Task 4: Implement Twitter Card Tags** (AC: #4)
  - [ ] Generate Twitter Card tags:
    - `twitter:card` = "summary_large_image"
    - `twitter:title` (listing title)
    - `twitter:description` (listing description)
    - `twitter:image` (first image)
  - [ ] Format as HTML meta tags

- [ ] **Task 5: Implement Structured Data (JSON-LD)** (AC: #5)
  - [ ] Create `generateStructuredData(listing)` function
  - [ ] Generate Schema.org RealEstateListing:
    ```json
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "name": "...",
      "description": "...",
      "price": "...",
      "priceCurrency": "VND",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "...",
        "addressCountry": "VN"
      },
      "image": ["..."],
      "numberOfRooms": "...",
      "floorSize": { "@type": "QuantitativeValue", "value": "..." }
    }
    ```
  - [ ] Validate with Google Rich Results Test

- [ ] **Task 6: Implement Default Meta Tags** (AC: #6)
  - [ ] Create `generateDefaultMetaTags(page)` function
  - [ ] Define defaults for:
    - Homepage: "Tìm kiếm bất động sản | Public Marketplace"
    - Browse: "Danh sách bất động sản | Public Marketplace"
  - [ ] Use default OG image (logo or hero image)

- [ ] **Task 7: Add HTML Escaping** (AC: #7)
  - [ ] Create `escapeHtml(text)` utility function
  - [ ] Escape special characters:
    - `<` → `&lt;`
    - `>` → `&gt;`
    - `"` → `&quot;`
    - `&` → `&amp;`
    - `'` → `&#39;`
  - [ ] Apply to all meta tag content

- [ ] **Task 8: Handle Image URLs** (AC: #8)
  - [ ] Create `getAbsoluteImageUrl(path)` function
  - [ ] Convert relative URLs to absolute:
    - Use `process.env.PUBLIC_URL` or `process.env.DOMAIN`
    - Format: `https://domain.com/images/{path}`
  - [ ] Add image dimensions if available (width, height)
  - [ ] Fallback to default image if no images

- [ ] **Task 9: Integrate with HTML Template** (AC: #1-#8)
  - [ ] Update `server/templates/html-template.ts`
  - [ ] Add `metaTags` parameter
  - [ ] Insert meta tags in `<head>` section
  - [ ] Insert structured data before closing `</body>`

- [ ] **Task 10: Update Route Handlers** (AC: #1-#8)
  - [ ] Update listing detail handler:
    - Generate meta tags from listing data
    - Pass to `renderPage()` function
  - [ ] Update homepage handler:
    - Use default meta tags
  - [ ] Update browse listings handler:
    - Use default meta tags

- [ ] **Task 11: Create Unit Tests**
  - [ ] Create `packages/twenty-front/server/utils/__tests__/meta-tags-generator.spec.ts`
  - [ ] Test cases:
    - Generate listing meta tags correctly
    - Truncate long titles/descriptions
    - Escape special characters
    - Generate absolute image URLs
    - Generate structured data correctly
    - Use defaults for missing data

- [ ] **Task 12: Validate with SEO Tools**
  - [ ] Test with Google Rich Results Test:
    - URL: https://search.google.com/test/rich-results
  - [ ] Test with Facebook Sharing Debugger:
    - URL: https://developers.facebook.com/tools/debug/
  - [ ] Test with Twitter Card Validator:
    - URL: https://cards-dev.twitter.com/validator
  - [ ] Verify all tags render correctly

## Dev Notes

### Architecture Context

**SEO Strategy**:
- Dynamic meta tags per listing (critical for SEO)
- Open Graph for social sharing
- Twitter Cards for Twitter previews
- Structured data for rich snippets
- All tags generated server-side for bots

**Key Design Decisions**:
- Template-based generation (not React Helmet for SSR)
- Escape all user content (security)
- Absolute URLs for images (required by OG/Twitter)
- Schema.org RealEstateListing type (best for real estate)

**Technology Stack**:
- Template strings for HTML generation
- Schema.org for structured data
- No external libraries (keep it simple)

### Project Structure Notes

**Meta Tags Generator Structure**:
```
packages/twenty-front/server/utils/
├── meta-tags-generator.ts       # Main generator
├── structured-data-generator.ts # JSON-LD generator
├── html-escape.ts              # HTML escaping utility
└── __tests__/
    └── meta-tags-generator.spec.ts
```

### Learnings from Previous Stories

**From Story 8.1.4 (SSR Rendering)**:
- HTML template at `server/templates/html-template.ts`
- Route handlers fetch listing data
- `renderPage()` function generates HTML

**Files to Modify**:
- Update `html-template.ts` to accept meta tags
- Update route handlers to generate meta tags
- Pass meta tags to `renderPage()`

### Implementation Details

**Meta Tags Generator**:
```typescript
// packages/twenty-front/server/utils/meta-tags-generator.ts
import { escapeHtml } from './html-escape';

interface ListingData {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
}

export function generateMetaTags(listing: ListingData): string {
  const domain = process.env.PUBLIC_URL || 'https://marketplace.example.com';
  const canonicalUrl = `${domain}/listings/${listing.id}`;

  // Title (max 60 chars)
  const title = truncate(`${listing.title} - ${listing.location} | Public Marketplace`, 60);

  // Description (max 160 chars)
  const description = truncate(listing.description, 160);

  // First image (absolute URL)
  const imageUrl = listing.images[0]
    ? `${domain}${listing.images[0]}`
    : `${domain}/images/default-listing.jpg`;

  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${canonicalUrl}">
    <meta name="robots" content="index, follow">

    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(listing.title)}">
    <meta property="og:description" content="${escapeHtml(truncate(listing.description, 200))}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Public Marketplace">
    <meta property="og:locale" content="vi_VN">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(listing.title)}">
    <meta name="twitter:description" content="${escapeHtml(truncate(listing.description, 200))}">
    <meta name="twitter:image" content="${imageUrl}">
  `.trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
```

**Structured Data Generator**:
```typescript
// packages/twenty-front/server/utils/structured-data-generator.ts
export function generateStructuredData(listing: ListingData): string {
  const domain = process.env.PUBLIC_URL || 'https://marketplace.example.com';

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": listing.title,
    "description": listing.description,
    "price": listing.price.toString(),
    "priceCurrency": "VND",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": listing.location,
      "addressCountry": "VN"
    },
    "image": listing.images.map(img => `${domain}${img}`),
    "numberOfRooms": listing.bedrooms || 0,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": listing.area || 0,
      "unitCode": "MTK" // Square meters
    }
  };

  return `<script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>`;
}
```

**HTML Escape Utility**:
```typescript
// packages/twenty-front/server/utils/html-escape.ts
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}
```

**Updated HTML Template**:
```typescript
// packages/twenty-front/server/templates/html-template.ts
interface HtmlTemplateProps {
  content: string;
  apolloState: any;
  metaTags: string;
  structuredData?: string;
}

export function htmlTemplate({ content, apolloState, metaTags, structuredData }: HtmlTemplateProps) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${metaTags}
</head>
<body>
  <div id="root">${content}</div>
  <script>
    window.__APOLLO_STATE__ = ${JSON.stringify(apolloState).replace(/</g, '\\u003c')};
  </script>
  <script src="/assets/main.js"></script>
  ${structuredData || ''}
</body>
</html>
  `.trim();
}
```

**Updated Route Handler**:
```typescript
// packages/twenty-front/server/routes/listing-detail.ts
import { generateMetaTags } from '../utils/meta-tags-generator';
import { generateStructuredData } from '../utils/structured-data-generator';

export async function listingDetailHandler(req: Request, res: Response) {
  const { id } = req.params;

  if (!req.isBot) {
    return res.sendFile('dist/client/index.html');
  }

  try {
    // Fetch listing data
    const { data } = await apolloClient.query({ query: GET_LISTING, variables: { id } });
    const listing = data.publicListing;

    // Generate meta tags and structured data
    const metaTags = generateMetaTags(listing);
    const structuredData = generateStructuredData(listing);

    // Render page
    const html = await renderPage(req.url, { metaTags, structuredData, data });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('[SSR] Error:', error);
    res.sendFile('dist/client/index.html');
  }
}
```

### Testing Strategy

**Unit Tests**:
```typescript
// packages/twenty-front/server/utils/__tests__/meta-tags-generator.spec.ts
import { generateMetaTags } from '../meta-tags-generator';

describe('Meta Tags Generator', () => {
  const mockListing = {
    id: '123',
    title: 'Beautiful Villa in Long Thành',
    description: 'Stunning 3-bedroom villa with pool',
    price: 5000000000,
    location: 'Long Thành, Đồng Nai',
    images: ['/images/villa-1.jpg'],
    propertyType: 'villa',
    bedrooms: 3,
    bathrooms: 2,
    area: 200,
  };

  it('should generate title tag', () => {
    const metaTags = generateMetaTags(mockListing);
    expect(metaTags).toContain('<title>Beautiful Villa in Long Thành - Long Thành, Đồng Nai | Public Marketplace</title>');
  });

  it('should generate description meta tag', () => {
    const metaTags = generateMetaTags(mockListing);
    expect(metaTags).toContain('<meta name="description" content="Stunning 3-bedroom villa with pool">');
  });

  it('should generate OG tags', () => {
    const metaTags = generateMetaTags(mockListing);
    expect(metaTags).toContain('og:title');
    expect(metaTags).toContain('og:description');
    expect(metaTags).toContain('og:image');
  });

  it('should escape special characters', () => {
    const listingWithSpecialChars = {
      ...mockListing,
      title: 'Villa with "quotes" & <tags>',
    };
    const metaTags = generateMetaTags(listingWithSpecialChars);
    expect(metaTags).toContain('&quot;');
    expect(metaTags).toContain('&lt;');
    expect(metaTags).toContain('&gt;');
  });

  it('should truncate long descriptions', () => {
    const longDescription = 'A'.repeat(200);
    const listingWithLongDesc = {
      ...mockListing,
      description: longDescription,
    };
    const metaTags = generateMetaTags(listingWithLongDesc);
    const match = metaTags.match(/name="description" content="([^"]+)"/);
    expect(match![1].length).toBeLessThanOrEqual(160);
  });
});
```

**SEO Validation**:
```bash
# Test with Google Rich Results Test
# 1. Start SSR server
yarn ssr:dev

# 2. Expose to internet (use ngrok)
ngrok http 3002

# 3. Test URL in Google Rich Results Test
# https://search.google.com/test/rich-results

# 4. Verify structured data is valid
```

### Schema.org RealEstateListing

**Required Properties**:
- `@type`: "RealEstateListing"
- `name`: Listing title
- `description`: Listing description
- `price`: Price in VND
- `priceCurrency`: "VND"
- `address`: PostalAddress object

**Recommended Properties**:
- `image`: Array of image URLs
- `numberOfRooms`: Bedrooms count
- `floorSize`: Area in square meters
- `datePosted`: Listing creation date

**Example**:
```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Beautiful Villa in Long Thành",
  "description": "Stunning 3-bedroom villa with pool",
  "price": "5000000000",
  "priceCurrency": "VND",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Long Thành",
    "addressRegion": "Đồng Nai",
    "addressCountry": "VN"
  },
  "image": [
    "https://marketplace.example.com/images/villa-1.jpg",
    "https://marketplace.example.com/images/villa-2.jpg"
  ],
  "numberOfRooms": 3,
  "floorSize": {
    "@type": "QuantitativeValue",
    "value": 200,
    "unitCode": "MTK"
  }
}
```

### References

- [Open Graph Protocol](https://ogp.me/) - OG tags specification
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards) - Twitter Card docs
- [Schema.org RealEstateListing](https://schema.org/RealEstateListing) - Structured data spec
- [Google Rich Results Test](https://search.google.com/test/rich-results) - Validation tool
- [Frontend Architecture Analysis](../real-estate-platform/frontend-architecture-analysis.md) - Section 5.2
- [Epic 8.1](../real-estate-platform/epics.md#story-815-dynamic-meta-tags-generation) - Story details

### Success Criteria

**Definition of Done**:
- ✅ Meta tags generator module created
- ✅ Listing meta tags generated correctly
- ✅ OG tags for social sharing
- ✅ Twitter Card tags
- ✅ Structured data (JSON-LD)
- ✅ Default meta tags for other pages
- ✅ HTML escaping implemented
- ✅ Absolute image URLs
- ✅ Unit tests pass
- ✅ Validated with Google Rich Results Test
- ✅ Validated with Facebook Sharing Debugger

**Verification Commands**:
```bash
# Run unit tests
yarn test meta-tags-generator

# Start server
yarn ssr:dev

# Test meta tags generation
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 > listing.html

# Verify meta tags
grep "<title>" listing.html
grep "og:title" listing.html
grep "twitter:card" listing.html
grep "application/ld+json" listing.html

# Validate with online tools
# 1. Expose with ngrok: ngrok http 3002
# 2. Test URL in Google Rich Results Test
# 3. Test URL in Facebook Sharing Debugger
```

## Dev Agent Record

### Context Reference

<!-- Story context XML will be added by story-context workflow -->

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- To be filled by dev agent during implementation -->

### Completion Notes List

<!-- To be filled by dev agent after completion -->

### File List

<!-- To be filled by dev agent with NEW/MODIFIED/DELETED files -->
