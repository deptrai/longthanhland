# Story 7.1: Interactive Plot Map

Status: drafted

## Story

As a **Sales Agent**,
I want an interactive plot map,
so that I can visually show available properties to customers.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-7.1.1 | Project | View map | Plots displayed with colors | Map renders |
| AC-7.1.2 | Plot | Click | Shows property details | Popup appears |
| AC-7.1.3 | Plot status | Changes | Color updates | Real-time update |

---

## Frontend Tasks

### FE-1: Create Plot Map Component (AC: 1-3)

**File**: `packages/twenty-front/src/modules/real-estate/components/PlotMap.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import styled from '@emotion/styled';

const STATUS_COLORS = {
  AVAILABLE: '#22c55e',    // Green
  RESERVED: '#eab308',     // Yellow
  DEPOSIT_PAID: '#f97316', // Orange
  CONTRACTED: '#3b82f6',   // Blue
  SOLD: '#6b7280',         // Gray
};

interface PlotMapProps {
  projectId: string;
}

export const PlotMap: React.FC<PlotMapProps> = ({ projectId }) => {
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);

  const { data, loading } = useQuery(GET_PROJECT_WITH_PROPERTIES, {
    variables: { projectId },
    pollInterval: 10000, // Refresh every 10 seconds
  });

  if (loading) return <Loading />;

  const project = data?.realEstateProject;
  const properties = project?.properties?.edges?.map(e => e.node) || [];

  return (
    <MapContainer>
      <MapHeader>
        <Title>{project?.name}</Title>
        <Legend>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <LegendItem key={status}>
              <ColorBox color={color} />
              <span>{status}</span>
            </LegendItem>
          ))}
        </Legend>
      </MapHeader>

      <SVGContainer>
        <svg viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet">
          {/* Master plan background image */}
          {project?.masterPlanImage && (
            <image
              href={project.masterPlanImage}
              x="0" y="0"
              width="1000" height="800"
              opacity="0.3"
            />
          )}

          {/* Plot polygons */}
          {properties.map((property) => (
            <PlotPolygon
              key={property.id}
              property={property}
              isSelected={selectedPlot === property.id}
              onClick={() => setSelectedPlot(property.id)}
              color={STATUS_COLORS[property.status]}
            />
          ))}
        </svg>
      </SVGContainer>

      {/* Property detail popup */}
      {selectedPlot && (
        <PropertyPopup
          propertyId={selectedPlot}
          onClose={() => setSelectedPlot(null)}
        />
      )}
    </MapContainer>
  );
};

interface PlotPolygonProps {
  property: Property;
  isSelected: boolean;
  onClick: () => void;
  color: string;
}

const PlotPolygon: React.FC<PlotPolygonProps> = ({
  property,
  isSelected,
  onClick,
  color,
}) => {
  // Parse coordinates from property.plotCoordinates
  // Format: "x1,y1 x2,y2 x3,y3 x4,y4"
  const points = property.plotCoordinates || '0,0 100,0 100,100 0,100';

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <polygon
        points={points}
        fill={color}
        fillOpacity={isSelected ? 0.8 : 0.6}
        stroke={isSelected ? '#000' : '#fff'}
        strokeWidth={isSelected ? 3 : 1}
      />
      <text
        x={getCentroid(points).x}
        y={getCentroid(points).y}
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="bold"
      >
        {property.plotNumber}
      </text>
    </g>
  );
};
```

**Subtasks**:
- [ ] Create PlotMap component
- [ ] Add SVG rendering
- [ ] Add status colors
- [ ] Add click handler
- [ ] Add legend

### FE-2: Create Property Popup (AC: 2)

**File**: `packages/twenty-front/src/modules/real-estate/components/PropertyPopup.tsx`

```tsx
import { useQuery } from '@apollo/client';

interface PropertyPopupProps {
  propertyId: string;
  onClose: () => void;
}

export const PropertyPopup: React.FC<PropertyPopupProps> = ({
  propertyId,
  onClose,
}) => {
  const { data, loading } = useQuery(GET_PROPERTY_DETAIL, {
    variables: { id: propertyId },
  });

  if (loading) return <Loading />;

  const property = data?.realEstateProperty;

  return (
    <PopupContainer>
      <CloseButton onClick={onClose}>×</CloseButton>

      <PropertyHeader>
        <PlotNumber>{property.plotNumber}</PlotNumber>
        <StatusBadge status={property.status} />
      </PropertyHeader>

      <PropertyDetails>
        <DetailRow>
          <Label>Area</Label>
          <Value>{property.area} m²</Value>
        </DetailRow>
        <DetailRow>
          <Label>Price</Label>
          <Value>{formatCurrency(property.price)}</Value>
        </DetailRow>
        <DetailRow>
          <Label>Direction</Label>
          <Value>{property.direction}</Value>
        </DetailRow>
        <DetailRow>
          <Label>Block/Zone</Label>
          <Value>{property.blockZone}</Value>
        </DetailRow>
      </PropertyDetails>

      {property.status === 'AVAILABLE' && (
        <ReserveButton propertyId={property.id} />
      )}

      {property.status === 'RESERVED' && (
        <ReservationInfo>
          Reserved until: {formatDate(property.reservedUntil)}
        </ReservationInfo>
      )}
    </PopupContainer>
  );
};
```

---

## Backend Tasks

### BE-1: Add Plot Coordinates Field (AC: 1)

Ensure Property entity has `plotCoordinates` field (already in Story 2.2).

### BE-2: Create Map Query (AC: 1)

```graphql
query GetProjectWithProperties($projectId: ID!) {
  realEstateProject(id: $projectId) {
    id
    name
    masterPlanImage
    properties {
      edges {
        node {
          id
          plotNumber
          status
          area
          price
          direction
          blockZone
          plotCoordinates
          reservedUntil
        }
      }
    }
  }
}
```

---

## Testing Tasks

### TEST-1: Map Component Tests

```typescript
describe('PlotMap', () => {
  it('should render all plots with correct colors', () => {
    const properties = [
      { id: '1', status: 'AVAILABLE', plotCoordinates: '0,0 100,0 100,100 0,100' },
      { id: '2', status: 'RESERVED', plotCoordinates: '100,0 200,0 200,100 100,100' },
    ];

    render(<PlotMap projectId="project-1" />);

    expect(screen.getByTestId('plot-1')).toHaveStyle({ fill: '#22c55e' });
    expect(screen.getByTestId('plot-2')).toHaveStyle({ fill: '#eab308' });
  });

  it('should show popup on plot click', async () => {
    render(<PlotMap projectId="project-1" />);

    fireEvent.click(screen.getByTestId('plot-1'));

    expect(await screen.findByText('Property Details')).toBeInTheDocument();
  });
});
```

---

## Definition of Done

- [ ] PlotMap component created
- [ ] Plots render with status colors
- [ ] Click shows property popup
- [ ] Real-time updates work
- [ ] Legend displays
- [ ] Tests passing

---

## Dev Notes

### Plot Coordinates Format

```
plotCoordinates: "x1,y1 x2,y2 x3,y3 x4,y4"

Example (rectangle):
"100,100 200,100 200,200 100,200"
```

### Color Scheme

| Status | Color | Hex |
|--------|-------|-----|
| AVAILABLE | Green | #22c55e |
| RESERVED | Yellow | #eab308 |
| DEPOSIT_PAID | Orange | #f97316 |
| CONTRACTED | Blue | #3b82f6 |
| SOLD | Gray | #6b7280 |

### References
- [Source: tech-spec-epic-7.md#Interactive-Plot-Map]

---

## Dev Agent Record

### File List
- packages/twenty-front/src/modules/real-estate/components/PlotMap.tsx
- packages/twenty-front/src/modules/real-estate/components/PropertyPopup.tsx
