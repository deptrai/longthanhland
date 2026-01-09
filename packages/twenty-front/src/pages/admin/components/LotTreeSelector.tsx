import styled from '@emotion/styled';
import React, { useState, useEffect } from 'react';
import { useAdminLots } from '../../../modules/dainganxanh/admin/hooks/useAdminLots';

const Container = styled.div`
    margin-bottom: 24px;
`;

const Label = styled.label`
    display: block;
    font-weight: 600;
    font-size: 14px;
    color: #1e293b;
    margin-bottom: 8px;
`;

const Select = styled.select`
    width: 100%;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
`;

const TreeSelectContainer = styled.div`
    margin-top: 12px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
    background: #f8fafc;
`;

const TreeCheckbox = styled.label`
    display: flex;
    align-items: center;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 14px;

    &:hover {
        background: #e2e8f0;
    }

    input {
        margin-right: 8px;
    }
`;

const GPSSuggestion = styled.div`
    margin-top: 8px;
    padding: 8px 12px;
    background: #dbeafe;
    border-left: 3px solid #3b82f6;
    border-radius: 4px;
    font-size: 13px;
    color: #1e40af;
`;

interface LotTreeSelectorProps {
    selectedLotId?: string;
    selectedTreeIds?: string[];
    photoGPS?: { lat: number; lng: number };
    onLotChange: (lotId: string) => void;
    onTreesChange: (treeIds: string[]) => void;
}

export const LotTreeSelector = ({
    selectedLotId,
    selectedTreeIds = [],
    photoGPS,
    onLotChange,
    onTreesChange,
}: LotTreeSelectorProps) => {
    const { lots, loading } = useAdminLots();
    const [trees, setTrees] = useState<any[]>([]);

    useEffect(() => {
        if (selectedLotId) {
            const lot = lots.find((l) => l.id === selectedLotId);
            setTrees(lot?.trees || []);
        } else {
            setTrees([]);
        }
    }, [selectedLotId, lots]);

    const handleTreeToggle = (treeId: string) => {
        if (selectedTreeIds.includes(treeId)) {
            onTreesChange(selectedTreeIds.filter((id) => id !== treeId));
        } else {
            onTreesChange([...selectedTreeIds, treeId]);
        }
    };

    // Simple GPS-based suggestion (can be enhanced)
    const suggestedLot = photoGPS
        ? lots.find((lot) => {
            if (!lot.gpsCenter) return false;
            const [lat, lng] = lot.gpsCenter.split(',').map(Number);
            const distance = Math.sqrt(
                Math.pow(lat - photoGPS.lat, 2) + Math.pow(lng - photoGPS.lng, 2),
            );
            return distance < 0.01; // ~1km threshold
        })
        : null;

    return (
        <Container>
            <Label>Select Lot</Label>
            <Select
                value={selectedLotId || ''}
                onChange={(e) => onLotChange(e.target.value)}
                disabled={loading}
            >
                <option value="">-- Select a lot --</option>
                {lots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                        {lot.lotName} ({lot.lotCode}) - {lot.treeCount}/{lot.capacity} trees
                    </option>
                ))}
            </Select>

            {suggestedLot && !selectedLotId && (
                <GPSSuggestion>
                    💡 Suggested based on GPS: {suggestedLot.lotName}
                </GPSSuggestion>
            )}

            {selectedLotId && trees.length > 0 && (
                <>
                    <Label style={{ marginTop: '16px' }}>
                        Tag Specific Trees (Optional)
                    </Label>
                    <TreeSelectContainer>
                        {trees.map((tree) => (
                            <TreeCheckbox key={tree.id}>
                                <input
                                    type="checkbox"
                                    checked={selectedTreeIds.includes(tree.id)}
                                    onChange={() => handleTreeToggle(tree.id)}
                                />
                                {tree.treeCode || tree.code} - {tree.status}
                            </TreeCheckbox>
                        ))}
                    </TreeSelectContainer>
                </>
            )}
        </Container>
    );
};
