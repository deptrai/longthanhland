import styled from '@emotion/styled';
import React, { useState, Suspense, lazy } from 'react';
import { Button } from './ui/Button';
import { useQuery, gql } from '@apollo/client';
import { TreeLot } from '../../../modules/dainganxanh/admin/types/lot-management.types';

const TreeLocationMap = lazy(() =>
    import('../../../modules/dainganxanh/tree-detail/components/TreeLocationMap').then(module => ({
        default: module.TreeLocationMap
    }))
);

const GET_WORKSPACE_MEMBERS = gql`
    query GetWorkspaceMembers {
        workspaceMembers {
            edges {
                node {
                    id
                    name {
                        firstName
                        lastName
                    }
                }
            }
        }
    }
`;

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const Panel = styled.div`
    background: white;
    padding: 24px;
    border-radius: 8px;
    width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
    margin: 0 0 16px;
    font-size: 18px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
`;

const Section = styled.div`
    margin-bottom: 16px;
`;

const Label = styled.div`
    font-weight: 600;
    font-size: 13px;
    color: #64748b;
    margin-bottom: 4px;
`;

const Value = styled.div`
    font-size: 14px;
    color: #1e293b;
`;

const MapContainer = styled.div`
    width: 100%;
    height: 200px;
    border-radius: 8px;
    margin-top: 8px;
    overflow: hidden;
`;

const Select = styled.select`
    width: 100%;
    padding: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 14px;
    margin-top: 8px;
`;

const ButtonGroup = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
`;

interface LotDetailsPanelProps {
    lot: TreeLot;
    onClose: () => void;
    onAssignOperator: (lotId: string, operatorId: string) => Promise<void>;
}

export const LotDetailsPanel = ({
    lot,
    onClose,
    onAssignOperator,
}: LotDetailsPanelProps) => {
    const [selectedOperator, setSelectedOperator] = useState(
        lot.assignedOperator?.id || '',
    );
    const [saving, setSaving] = useState(false);

    // Fetch workspace members from GraphQL
    const { data: membersData, loading: loadingMembers } = useQuery(GET_WORKSPACE_MEMBERS);

    const operators = membersData?.workspaceMembers?.edges?.map((edge: any) => ({
        id: edge.node.id,
        name: `${edge.node.name?.firstName || ''} ${edge.node.name?.lastName || ''}`.trim() || 'Unnamed',
    })) || [];

    const handleSave = async () => {
        if (!selectedOperator) {
            alert('Please select an operator');
            return;
        }

        setSaving(true);
        try {
            await onAssignOperator(lot.id, selectedOperator);
        } finally {
            setSaving(false);
        }
    };

    const capacityPercentage = lot.capacity
        ? (lot.treeCount / lot.capacity) * 100
        : 0;

    // Parse GPS coordinates from gpsCenter (format: "lat,lng")
    const parseGpsCenter = (gpsCenter?: string) => {
        if (!gpsCenter) return null;
        const [lat, lng] = gpsCenter.split(',').map(coord => parseFloat(coord.trim()));
        if (isNaN(lat) || isNaN(lng)) return null;
        return { lat, lng };
    };

    const coordinates = parseGpsCenter(lot.gpsCenter);

    return (
        <Overlay onClick={onClose}>
            <Panel onClick={(e) => e.stopPropagation()}>
                <Title>Lot Details: {lot.lotName}</Title>

                <Section>
                    <Label>Lot Code</Label>
                    <Value>{lot.lotCode}</Value>
                </Section>

                <Section>
                    <Label>Location</Label>
                    <Value>{lot.location || 'N/A'}</Value>
                </Section>

                <Section>
                    <Label>Capacity</Label>
                    <Value>
                        {lot.treeCount || 0} / {lot.capacity || 0} trees (
                        {capacityPercentage.toFixed(1)}%)
                    </Value>
                </Section>

                <Section>
                    <Label>GPS Center</Label>
                    <Value>{lot.gpsCenter || 'N/A'}</Value>
                    {coordinates && (
                        <MapContainer>
                            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading map...</div>}>
                                <TreeLocationMap
                                    latitude={coordinates.lat}
                                    longitude={coordinates.lng}
                                    treeCode={lot.lotCode}
                                />
                            </Suspense>
                        </MapContainer>
                    )}
                </Section>

                <Section>
                    <Label>Assign Operator</Label>
                    <Select
                        value={selectedOperator}
                        onChange={(e) => setSelectedOperator(e.target.value)}
                    >
                        <option value="">Select operator...</option>
                        {operators.map((op: any) => (
                            <option key={op.id} value={op.id}>
                                {op.name}
                            </option>
                        ))}
                    </Select>
                </Section>

                <ButtonGroup>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </ButtonGroup>
            </Panel>
        </Overlay>
    );
};
