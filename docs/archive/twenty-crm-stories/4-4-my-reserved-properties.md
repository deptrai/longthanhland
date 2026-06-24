# Story 4.4: Quick Reserve Action

Status: drafted

## Story

As a **Sales Agent**,
I want a quick reserve button on property cards,
so that I can reserve properties with one click.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-4.4.1 | Property AVAILABLE | Click reserve | Property reserved | Status = RESERVED |
| AC-4.4.2 | Property reserved | UI updates | Shows reserved badge | Badge displays |
| AC-4.4.3 | Property not available | Reserve button | Disabled | Button disabled |

---

## Frontend Tasks

### FE-1: Create Reserve Button Hook (AC: 1)

**File**: `packages/twenty-front/src/modules/real-estate/hooks/useReserveProperty.ts`

```tsx
import { useMutation, gql } from '@apollo/client';
import { useState } from 'react';

const RESERVE_PROPERTY = gql`
  mutation ReserveProperty($propertyId: ID!) {
    reserveProperty(propertyId: $propertyId) {
      id
      status
      reservedUntil
      reservedBy { id name { firstName lastName } }
    }
  }
`;

export const useReserveProperty = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reserveMutation] = useMutation(RESERVE_PROPERTY, {
    onError: (err) => {
      setError(err.message);
    },
    refetchQueries: ['GetProperties', 'GetProjectWithProperties'],
  });

  const reserve = async (propertyId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await reserveMutation({
        variables: { propertyId },
      });
      return result.data?.reserveProperty;
    } catch (err) {
      // Error handled by onError
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { reserve, isLoading, error };
};
```

### FE-2: Create Quick Reserve Button (AC: 1-3)

**File**: `packages/twenty-front/src/modules/real-estate/components/QuickReserveButton.tsx`

```tsx
import { useState } from 'react';
import styled from '@emotion/styled';
import { useReserveProperty } from '../hooks/useReserveProperty';

interface QuickReserveButtonProps {
  propertyId: string;
  status: string;
  onSuccess?: () => void;
}

export const QuickReserveButton: React.FC<QuickReserveButtonProps> = ({
  propertyId,
  status,
  onSuccess,
}) => {
  const { reserve, isLoading, error } = useReserveProperty();
  const [showConfirm, setShowConfirm] = useState(false);

  const isAvailable = status === 'AVAILABLE';

  const handleReserve = async () => {
    const result = await reserve(propertyId);
    if (result) {
      setShowConfirm(false);
      onSuccess?.();
    }
  };

  if (!isAvailable) {
    return (
      <DisabledButton disabled>
        {status === 'RESERVED' ? 'Reserved' : status}
      </DisabledButton>
    );
  }

  return (
    <>
      <ReserveButton onClick={() => setShowConfirm(true)} disabled={isLoading}>
        {isLoading ? 'Reserving...' : 'Quick Reserve'}
      </ReserveButton>

      {showConfirm && (
        <ConfirmModal>
          <ModalContent>
            <h3>Confirm Reservation</h3>
            <p>Reserve this property for 24 hours?</p>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <ButtonGroup>
              <CancelButton onClick={() => setShowConfirm(false)}>
                Cancel
              </CancelButton>
              <ConfirmButton onClick={handleReserve} disabled={isLoading}>
                {isLoading ? 'Reserving...' : 'Confirm'}
              </ConfirmButton>
            </ButtonGroup>
          </ModalContent>
        </ConfirmModal>
      )}
    </>
  );
};

const ReserveButton = styled.button`
  background: #22c55e;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: #16a34a;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DisabledButton = styled(ReserveButton)`
  background: #6b7280;
  cursor: not-allowed;
`;
```

### FE-3: Update Property Card (AC: 2)

**File**: `packages/twenty-front/src/modules/real-estate/components/PropertyCard.tsx`

```tsx
import { QuickReserveButton } from './QuickReserveButton';
import { PropertyStatusBadge } from './PropertyStatusBadge';

interface PropertyCardProps {
  property: Property;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  return (
    <Card>
      <CardHeader>
        <PlotNumber>{property.plotNumber}</PlotNumber>
        <PropertyStatusBadge status={property.status} />
      </CardHeader>

      <CardBody>
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
      </CardBody>

      <CardFooter>
        <QuickReserveButton
          propertyId={property.id}
          status={property.status}
        />
      </CardFooter>
    </Card>
  );
};
```

---

## Testing Tasks

### TEST-1: Quick Reserve Tests

```typescript
describe('QuickReserveButton', () => {
  it('should show reserve button for available property', () => {
    render(<QuickReserveButton propertyId="1" status="AVAILABLE" />);
    expect(screen.getByText('Quick Reserve')).toBeEnabled();
  });

  it('should be disabled for reserved property', () => {
    render(<QuickReserveButton propertyId="1" status="RESERVED" />);
    expect(screen.getByText('Reserved')).toBeDisabled();
  });

  it('should call mutation on confirm', async () => {
    render(<QuickReserveButton propertyId="1" status="AVAILABLE" />);

    fireEvent.click(screen.getByText('Quick Reserve'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockReserveMutation).toHaveBeenCalledWith({
        variables: { propertyId: '1' },
      });
    });
  });
});
```

---

## Definition of Done

- [ ] useReserveProperty hook created
- [ ] QuickReserveButton component created
- [ ] Confirmation modal works
- [ ] Button disabled for non-available
- [ ] UI updates after reserve
- [ ] Tests passing

---

## Dev Notes

### Reserve Flow

```
1. Agent clicks "Quick Reserve"
2. Confirmation modal appears
3. Agent confirms
4. API call to reserveProperty
5. UI updates with new status
6. 24-hour timer starts
```

### References
- [Source: tech-spec-epic-4.md#Quick-Reserve]

---

## Dev Agent Record

### File List
- packages/twenty-front/src/modules/real-estate/hooks/useReserveProperty.ts
- packages/twenty-front/src/modules/real-estate/components/QuickReserveButton.tsx
- packages/twenty-front/src/modules/real-estate/components/PropertyCard.tsx
