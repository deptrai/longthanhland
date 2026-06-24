# Story 8.1.4: SSR Rendering for Public Routes

Status: drafted

## Story

As a developer,
I want to implement SSR rendering for public marketplace routes,
so that bots receive fully rendered HTML with content.

## Acceptance Criteria

1. **SSR Renderer Module Created**
   - Given bot detection working (Story 8.1.3)
   - When bot requests a public page
   - Then server uses `react-dom/server.renderToString()` to render React components
   - And SSR renderer module exists at `server/ssr-renderer.ts`

2. **Data Fetching Before Rendering**
   - Given SSR rendering active
   - When data is needed for page
   - Then GraphQL API is called before rendering (server-side)
   - And data is passed to React components as props
   - And Apollo Client SSR is configured

3. **Complete HTML Response**
   - Given HTML rendered
   - When response sent to bot
   - Then complete HTML document returned with:
     - DOCTYPE declaration
     - HTML structure (head, body)
     - Rendered React content
     - Inline scripts for hydration
     - Status code 200
   - And content-type is `text/html`

4. **Performance Target**
   - Given SSR rendering
   - When measured
   - Then completes within 500ms (P95)
   - And no memory leaks over time

5. **Error Handling and Fallback**
   - Given SSR error occurs
   - When rendering fails
   - Then server logs error with stack trace
   - And gracefully falls back to CSR (redirect or minimal HTML)
   - And returns status 500 with error page

6. **Routes Implemented**
   - Given SSR renderer ready
   - When bot requests routes
   - Then the following routes work:
     - `GET /` (homepage)
     - `GET /listings` (browse listings)
     - `GET /listings/:id` (listing detail - CRITICAL)
   - And each route fetches appropriate data

## Tasks / Subtasks

- [ ] **Task 1: Install SSR Dependencies** (AC: #1, #2)
  - [ ] Add to `packages/twenty-front/package.json`:
    - `react-dom@^18.3.1` (already installed, verify)
    - `@apollo/client@^3.11.0` (for GraphQL)
    - `isomorphic-fetch@^3.0.0` (for server-side fetch)
  - [ ] Run `yarn install`

- [ ] **Task 2: Create SSR Renderer Module** (AC: #1)
  - [ ] Create `packages/twenty-front/server/ssr-renderer.ts`
  - [ ] Import `renderToString` from `react-dom/server`
  - [ ] Import `StaticRouter` from `react-router-dom/server`
  - [ ] Create `renderApp(url, data)` function
  - [ ] Setup React app rendering with router

- [ ] **Task 3: Configure Apollo Client for SSR** (AC: #2)
  - [ ] Create `packages/twenty-front/server/utils/apollo-ssr-client.ts`
  - [ ] Configure Apollo Client with:
    - HttpLink pointing to GraphQL API
    - InMemoryCache
    - SSR mode enabled
  - [ ] Create function to fetch data before render
  - [ ] Extract initial state for hydration

- [ ] **Task 4: Create HTML Template** (AC: #3)
  - [ ] Create `packages/twenty-front/server/templates/html-template.ts`
  - [ ] Define HTML template function:
    - DOCTYPE
    - `<html>` with lang attribute
    - `<head>` with meta tags (basic)
    - `<body>` with rendered content
    - Inline script with `__APOLLO_STATE__` for hydration
    - Script tags for client bundle
  - [ ] Support dynamic title and meta tags

- [ ] **Task 5: Implement Homepage SSR** (AC: #6)
  - [ ] Create route handler for `GET /`
  - [ ] Check `req.isBot` from middleware
  - [ ] If bot:
    - Fetch homepage data (featured listings)
    - Render React app with data
    - Return HTML
  - [ ] If user:
    - Serve static index.html (CSR)

- [ ] **Task 6: Implement Browse Listings SSR** (AC: #6)
  - [ ] Create route handler for `GET /listings`
  - [ ] Check `req.isBot`
  - [ ] If bot:
    - Fetch listings list (first page, 20 items)
    - Render React app with listings
    - Return HTML
  - [ ] If user:
    - Serve static index.html (CSR)

- [ ] **Task 7: Implement Listing Detail SSR** (AC: #6)
  - [ ] Create route handler for `GET /listings/:id`
  - [ ] Check `req.isBot`
  - [ ] If bot:
    - Extract listing ID from params
    - Fetch listing data from GraphQL API
    - Render React app with listing
    - Return HTML with listing content
  - [ ] If user:
    - Serve static index.html (CSR)
  - [ ] Handle 404 if listing not found

- [ ] **Task 8: Add Error Boundaries** (AC: #5)
  - [ ] Create `packages/twenty-front/server/utils/error-boundary.tsx`
  - [ ] Wrap React app with error boundary
  - [ ] Catch rendering errors
  - [ ] Log errors with Winston
  - [ ] Return fallback HTML on error

- [ ] **Task 9: Implement Fallback to CSR** (AC: #5)
  - [ ] On SSR error, return minimal HTML:
    - Basic HTML structure
    - Script tag to load client bundle
    - Let client-side React take over
  - [ ] Log fallback event
  - [ ] Monitor fallback rate

- [ ] **Task 10: Performance Optimization** (AC: #4)
  - [ ] Add timeout for data fetching (3 seconds)
  - [ ] Optimize GraphQL queries (only fetch needed fields)
  - [ ] Use DataLoader pattern if needed
  - [ ] Add performance logging:
    - Data fetch time
    - Render time
    - Total SSR time
  - [ ] Target: <500ms P95

- [ ] **Task 11: Create Integration Tests** (AC: #1-#6)
  - [ ] Create `packages/twenty-front/server/__tests__/ssr-renderer.spec.ts`
  - [ ] Test cases:
    - Homepage renders correctly
    - Browse listings renders correctly
    - Listing detail renders correctly
    - Error handling works
    - Fallback to CSR works
    - Performance within 500ms
  - [ ] Mock GraphQL API responses

- [ ] **Task 12: Testing and Verification**
  - [ ] Start SSR server: `yarn ssr:dev`
  - [ ] Test with bot user-agent:
    ```bash
    curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/
    curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings
    curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123
    ```
  - [ ] Verify HTML contains rendered content (not just loading spinner)
  - [ ] Test with regular user-agent (should get CSR)
  - [ ] Check performance logs
  - [ ] Run integration tests: `yarn test ssr-renderer`

## Dev Notes

### Architecture Context

**SSR Rendering Flow**:
1. Bot request arrives → Bot detection middleware sets `req.isBot = true`
2. Route handler checks `req.isBot`
3. If bot → Fetch data from GraphQL API → Render React with data → Return HTML
4. If user → Serve static HTML → Client-side React hydrates

**Key Design Decisions**:
- Use `renderToString` (not `renderToPipeableStream` for simplicity)
- Apollo Client for GraphQL data fetching
- StaticRouter for server-side routing
- Inline `__APOLLO_STATE__` for client hydration
- Fallback to CSR on errors (graceful degradation)

**Technology Stack**:
- react-dom/server (SSR rendering)
- Apollo Client 3.x (GraphQL)
- StaticRouter (React Router SSR)
- isomorphic-fetch (server-side fetch)

### Project Structure Notes

**SSR Renderer Structure**:
```
packages/twenty-front/server/
├── ssr-renderer.ts          # Main SSR renderer
├── templates/
│   └── html-template.ts     # HTML template
├── utils/
│   ├── apollo-ssr-client.ts # Apollo Client config
│   └── error-boundary.tsx   # Error boundary component
└── __tests__/
    └── ssr-renderer.spec.ts # Integration tests
```

**Route Handlers**:
```
packages/twenty-front/server/routes/
├── index.ts                 # Main routes file
├── homepage.ts              # Homepage handler
├── listings.ts              # Browse listings handler
└── listing-detail.ts        # Listing detail handler
```

### Learnings from Previous Stories

**From Story 8.1.1 (Project Setup)**:
- Module structure created
- Frontend components directory: `packages/twenty-front/src/modules/public-marketplace/`

**From Story 8.1.2 (Express SSR Server)**:
- Express server running on port 3002
- Winston logger configured
- Basic routing established

**From Story 8.1.3 (Bot Detection)**:
- `req.isBot` available in route handlers
- Bot detection middleware active
- Logging patterns established

**Files to Use**:
- Use logger from `server/utils/logger.ts`
- Check `req.isBot` in route handlers
- Follow Express routing patterns

### Implementation Details

**SSR Renderer Module**:
```typescript
// packages/twenty-front/server/ssr-renderer.ts
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { ApolloProvider } from '@apollo/client';
import { createApolloSSRClient } from './utils/apollo-ssr-client';
import App from '../src/App'; // Main React app
import { htmlTemplate } from './templates/html-template';

export async function renderPage(url: string, data?: any) {
  // Create Apollo Client for SSR
  const apolloClient = createApolloSSRClient();

  // Render React app to string
  const appHtml = renderToString(
    <ApolloProvider client={apolloClient}>
      <StaticRouter location={url}>
        <App initialData={data} />
      </StaticRouter>
    </ApolloProvider>
  );

  // Extract Apollo state for hydration
  const apolloState = apolloClient.extract();

  // Generate complete HTML
  const html = htmlTemplate({
    content: appHtml,
    apolloState,
    title: 'Public Marketplace',
  });

  return html;
}
```

**Apollo SSR Client**:
```typescript
// packages/twenty-front/server/utils/apollo-ssr-client.ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import fetch from 'isomorphic-fetch';

export function createApolloSSRClient() {
  return new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
      uri: process.env.GRAPHQL_API_URL || 'http://localhost:3000/graphql',
      fetch,
    }),
    cache: new InMemoryCache(),
  });
}
```

**HTML Template**:
```typescript
// packages/twenty-front/server/templates/html-template.ts
interface HtmlTemplateProps {
  content: string;
  apolloState: any;
  title: string;
  metaTags?: string;
}

export function htmlTemplate({ content, apolloState, title, metaTags = '' }: HtmlTemplateProps) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${metaTags}
</head>
<body>
  <div id="root">${content}</div>
  <script>
    window.__APOLLO_STATE__ = ${JSON.stringify(apolloState).replace(/</g, '\\u003c')};
  </script>
  <script src="/assets/main.js"></script>
</body>
</html>
  `.trim();
}
```

**Route Handler Example (Listing Detail)**:
```typescript
// packages/twenty-front/server/routes/listing-detail.ts
import { Request, Response } from 'express';
import { gql } from '@apollo/client';
import { renderPage } from '../ssr-renderer';
import { createApolloSSRClient } from '../utils/apollo-ssr-client';
import { logger } from '../utils/logger';

const GET_LISTING = gql`
  query GetListing($id: ID!) {
    publicListing(id: $id) {
      id
      title
      description
      price
      location
      images
      propertyType
      bedrooms
      bathrooms
      area
    }
  }
`;

export async function listingDetailHandler(req: Request, res: Response) {
  const { id } = req.params;

  // If not bot, serve CSR
  if (!req.isBot) {
    return res.sendFile('dist/client/index.html');
  }

  try {
    const start = Date.now();

    // Fetch listing data
    const apolloClient = createApolloSSRClient();
    const { data } = await apolloClient.query({
      query: GET_LISTING,
      variables: { id },
    });

    if (!data.publicListing) {
      return res.status(404).send('Listing not found');
    }

    // Render page with data
    const html = await renderPage(req.url, data);

    const duration = Date.now() - start;
    logger.info(`[SSR] Rendered listing ${id} in ${duration}ms`);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('[SSR] Rendering error:', error);

    // Fallback to CSR
    res.sendFile('dist/client/index.html');
  }
}
```

**Error Boundary**:
```typescript
// packages/twenty-front/server/utils/error-boundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SSRErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SSR Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please try again later.</div>;
    }

    return this.props.children;
  }
}
```

### Testing Strategy

**Integration Tests**:
```typescript
// packages/twenty-front/server/__tests__/ssr-renderer.spec.ts
import { renderPage } from '../ssr-renderer';

describe('SSR Renderer', () => {
  it('should render homepage', async () => {
    const html = await renderPage('/');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<div id="root">');
    expect(html).toContain('window.__APOLLO_STATE__');
  });

  it('should render listing detail', async () => {
    const mockData = {
      publicListing: {
        id: '123',
        title: 'Test Listing',
        price: 5000000000,
      }
    };

    const html = await renderPage('/listings/123', mockData);

    expect(html).toContain('Test Listing');
    expect(html).toContain('5000000000');
  });

  it('should complete within 500ms', async () => {
    const start = Date.now();
    await renderPage('/');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });
});
```

**Manual Testing**:
```bash
# Test with bot user-agent
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/ > homepage.html
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings > listings.html
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 > listing-detail.html

# Verify HTML contains rendered content
grep "Public Marketplace" homepage.html
grep "Listing" listing-detail.html

# Test with regular user-agent (should get CSR)
curl -H "User-Agent: Mozilla/5.0 (Chrome)" http://localhost:3002/ > csr.html
# Should be minimal HTML with script tags
```

### Performance Optimization

**Data Fetching Optimization**:
- Only fetch fields needed for SEO
- Use GraphQL query optimization
- Add timeout (3 seconds max)
- Cache GraphQL responses in Redis (Story 8.1.6)

**Rendering Optimization**:
- Use `renderToString` (synchronous, simpler)
- Avoid heavy computations in render
- Minimize component tree depth
- Use React.memo for expensive components

**Performance Monitoring**:
```typescript
// Log SSR performance
logger.info('[SSR Performance]', {
  url: req.url,
  dataFetchTime: dataFetchDuration,
  renderTime: renderDuration,
  totalTime: totalDuration,
  isBot: req.isBot,
});
```

### GraphQL Queries

**Homepage Query**:
```graphql
query GetHomepageData {
  featuredListings(limit: 6) {
    id
    title
    price
    location
    images
    propertyType
  }
}
```

**Browse Listings Query**:
```graphql
query GetListings($page: Int, $limit: Int) {
  publicListings(page: $page, limit: $limit) {
    items {
      id
      title
      price
      location
      images
      propertyType
    }
    total
    hasMore
  }
}
```

**Listing Detail Query**:
```graphql
query GetListing($id: ID!) {
  publicListing(id: $id) {
    id
    title
    description
    price
    location
    images
    propertyType
    bedrooms
    bathrooms
    area
    seller {
      name
      phone
    }
  }
}
```

### References

- [React SSR Documentation](https://react.dev/reference/react-dom/server) - Official React SSR guide
- [Apollo Client SSR](https://www.apollographql.com/docs/react/performance/server-side-rendering/) - Apollo SSR setup
- [Architecture Document](../real-estate-platform/architecture.md) - ADR-006
- [Frontend Architecture Analysis](../real-estate-platform/frontend-architecture-analysis.md) - Section 5.2
- [Epic 8.1](../real-estate-platform/epics.md#story-814-ssr-rendering-for-public-routes) - Story details

### Success Criteria

**Definition of Done**:
- ✅ SSR renderer module created
- ✅ Apollo Client SSR configured
- ✅ Homepage SSR works
- ✅ Browse listings SSR works
- ✅ Listing detail SSR works (CRITICAL)
- ✅ Error handling and fallback implemented
- ✅ Performance <500ms P95
- ✅ Integration tests pass
- ✅ Manual testing with curl successful
- ✅ No memory leaks

**Verification Commands**:
```bash
# Run integration tests
yarn test ssr-renderer

# Start server
yarn ssr:dev

# Test SSR rendering
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/ -o homepage.html
curl -H "User-Agent: Googlebot/2.1" http://localhost:3002/listings/123 -o listing.html

# Verify HTML contains content
grep -i "listing" listing.html
grep -i "price" listing.html

# Check performance logs
tail -f logs/ssr-server.log | grep "SSR Performance"
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
