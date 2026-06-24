# Story 4.3: Property List & Filter

Status: drafted

## Story

As a **Sales Agent**,
I want to filter and search properties,
so that I can find suitable properties for customers.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-4.3.1 | Property list | Filter by status | Only matching shown | Filter works |
| AC-4.3.2 | Property list | Filter by project | Only project properties | Filter works |
| AC-4.3.3 | Property list | Search by plot number | Matching results | Search works |
| AC-4.3.4 | Property list | Filter by price range | Properties in range | Range filter works |

---

## Backend Tasks

### BE-1: Verify Twenty's Built-in Filtering (AC: 1-4)

> **IMPORTANT**: Twenty has built-in GraphQL filtering via `filter` argument.

Twenty's auto-generated GraphQL API already supports:
- Equality filters: `{ status: { eq: "AVAILABLE" } }`
- Contains filters: `{ plotNumber: { contains: "A-" } }`
- Range filters: `{ price: { gte: 1000000000, lte: 2000000000 } }`

**No custom backend work needed** - verify existing functionality.

---

## API Tasks

### API-1: Filter by Status (AC: 1)

```graphql
query FilterByStatus {
  realEstateProperties(
    filter: { status: { eq: "AVAILABLE" } }
    orderBy: { plotNumber: AscNullsLast }
  ) {
    edges {
      node {
        id
        plotNumber
        status
        price
        area
      }
    }
  }
}
```

### API-2: Filter by Project (AC: 2)

```graphql
query FilterByProject {
  realEstateProperties(
    filter: { projectId: { eq: "project-uuid" } }
  ) {
    edges {
      node {
        id
        plotNumber
        project { name }
      }
    }
  }
}
```

### API-3: Search by Plot Number (AC: 3)

```graphql
query SearchByPlotNumber {
  realEstateProperties(
    filter: { plotNumber: { ilike: "%A-1%" } }
  ) {
    edges {
      node {
        id
        plotNumber
      }
    }
  }
}
```

### API-4: Filter by Price Range (AC: 4)

```graphql
query FilterByPriceRange {
  realEstateProperties(
    filter: {
      and: [
        { price: { gte: 1000000000 } }
        { price: { lte: 2000000000 } }
      ]
    }
  ) {
    edges {
      node {
        id
        plotNumber
        price
      }
    }
  }
}
```

---

## Frontend Tasks

### FE-1: Create Filter Component (AC: 1-4)

**File**: `packages/twenty-front/src/modules/real-estate/components/PropertyFilters.tsx`

```tsx
import { useState } from 'react';
import styled from '@emotion/styled';

interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilters) => void;
}

interface PropertyFilters {
  status?: string;
  projectId?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
}

export const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  onFilterChange,
}) => {
  const [filters, setFilters] = useState<PropertyFilters>({});

  const handleChange = (key: keyof PropertyFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <FiltersContainer>
      {/* Status Filter */}
      <FilterGroup>
        <Label>Status</Label>
        <Select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value || undefined)}
        >
          <option value="">All</option>
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="DEPOSIT_PAID">Deposit Paid</option>
          <option value="SOLD">Sold</option>
        </Select>
      </FilterGroup>

      {/* Project Filter */}
      <FilterGroup>
        <Label>Project</Label>
        <ProjectSelect
          value={filters.projectId}
          onChange={(value) => handleChange('projectId', value)}
        />
      </FilterGroup>

      {/* Search */}
      <FilterGroup>
        <Label>Search</Label>
        <SearchInput
          placeholder="Plot number..."
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value || undefined)}
        />
      </FilterGroup>

      {/* Price Range */}
      <FilterGroup>
        <Label>Price Range (VNĐ)</Label>
        <RangeInputs>
          <NumberInput
            placeholder="Min"
            value={filters.priceMin || ''}
            onChange={(e) => handleChange('priceMin', e.target.value ? Number(e.target.value) : undefined)}
          />
          <span>-</span>
          <NumberInput
            placeholder="Max"
            value={filters.priceMax || ''}
            onChange={(e) => handleChange('priceMax', e.target.value ? Number(e.target.value) : undefined)}
          />
        </RangeInputs>
      </FilterGroup>

      <ClearButton onClick={() => {
        setFilters({});
        onFilterChange({});
      }}>
        Clear Filters
      </ClearButton>
    </FiltersContainer>
  );
};
```

### FE-2: Create Property List with Filters (AC: 1-4)

**File**: `packages/twenty-front/src/modules/real-estate/components/PropertyList.tsx`

```tsx
import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { PropertyFilters } from './PropertyFilters';

export const PropertyList: React.FC = () => {
  const [filters, setFilters] = useState<PropertyFilters>({});

  // Build GraphQL filter from UI filters
  const graphqlFilter = useMemo(() => {
    const conditions: any[] = [];

    if (filters.status) {
      conditions.push({ status: { eq: filters.status } });
    }
    if (filters.projectId) {
      conditions.push({ projectId: { eq: filters.projectId } });
    }
    if (filters.search) {
      conditions.push({ plotNumber: { ilike: `%${filters.search}%` } });
    }
    if (filters.priceMin) {
      conditions.push({ price: { gte: filters.priceMin } });
    }
    if (filters.priceMax) {
      conditions.push({ price: { lte: filters.priceMax } });
    }

    return conditions.length > 0 ? { and: conditions } : undefined;
  }, [filters]);

  const { data, loading } = useQuery(GET_PROPERTIES, {
    variables: { filter: graphqlFilter },
  });

  return (
    <Container>
      <PropertyFilters onFilterChange={setFilters} />

      {loading && <Loading />}

      <PropertyGrid>
        {data?.realEstateProperties?.edges?.map(({ node }) => (
          <PropertyCard key={node.id} property={node} />
        ))}
      </PropertyGrid>

      {data?.realEstateProperties?.edges?.length === 0 && (
        <EmptyState>No properties match your filters</EmptyState>
      )}
    </Container>
  );
};
```

---

## Testing Tasks

### TEST-1: Filter Tests

```typescript
describe('Property Filters', () => {
  it('should filter by status', async () => {
    await createProperty({ status: 'AVAILABLE' });
    await createProperty({ status: 'RESERVED' });

    const result = await queryProperties({
      filter: { status: { eq: 'AVAILABLE' } },
    });

    expect(result.length).toBe(1);
    expect(result[0].status).toBe('AVAILABLE');
  });

  it('should search by plot number', async () => {
    await createProperty({ plotNumber: 'A-101' });
    await createProperty({ plotNumber: 'B-201' });

    const result = await queryProperties({
      filter: { plotNumber: { ilike: '%A-%' } },
    });

    expect(result.length).toBe(1);
    expect(result[0].plotNumber).toBe('A-101');
  });

  it('should filter by price range', async () => {
    await createProperty({ price: 500000000 });
    await createProperty({ price: 1500000000 });
    await createProperty({ price: 2500000000 });

    const result = await queryProperties({
      filter: {
        and: [
          { price: { gte: 1000000000 } },
          { price: { lte: 2000000000 } },
        ],
      },
    });

    expect(result.length).toBe(1);
    expect(result[0].price).toBe(1500000000);
  });
});
```

---

## Definition of Done

- [ ] Status filter works
- [ ] Project filter works
- [ ] Plot number search works
- [ ] Price range filter works
- [ ] UI components created
- [ ] Tests passing

---

## Dev Notes

### Twenty Filter Operators

| Operator | Usage | Example |
|----------|-------|---------|
| eq | Equals | `{ status: { eq: "AVAILABLE" } }` |
| neq | Not equals | `{ status: { neq: "SOLD" } }` |
| in | In array | `{ status: { in: ["AVAILABLE", "RESERVED"] } }` |
| ilike | Case-insensitive like | `{ plotNumber: { ilike: "%A-%" } }` |
| gte | Greater or equal | `{ price: { gte: 1000000000 } }` |
| lte | Less or equal | `{ price: { lte: 2000000000 } }` |
| and | Combine conditions | `{ and: [{...}, {...}] }` |
| or | Or conditions | `{ or: [{...}, {...}] }` |

### References
- [Source: tech-spec-epic-4.md#Property-List-Filter]

---

## Dev Agent Record

### File List
- packages/twenty-front/src/modules/real-estate/components/PropertyFilters.tsx
- packages/twenty-front/src/modules/real-estate/components/PropertyList.tsx
