import styled from '@emotion/styled';
import React, { useEffect, useState } from 'react';
import { Button } from 'twenty-ui/input';

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalContainer = styled.div`
    background: white;
    padding: 24px;
    border-radius: 8px;
    width: 400px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
`;

const Title = styled.h2`
    margin: 0 0 16px;
    font-size: 18px;
`;

const Select = styled.select`
    width: 100%;
    padding: 8px;
    margin-bottom: 20px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
`;

const ButtonGroup = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 12px;
`;

interface AssignLotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (lotId: string) => Promise<void>;
}

export const AssignLotModal = ({ isOpen, onClose, onAssign }: AssignLotModalProps) => {
    const [lots, setLots] = useState<any[]>([]);
    const [selectedLot, setSelectedLot] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/orders/lots').then(res => res.json()).then(json => {
                setLots(json.data);
                if (json.data.length > 0) setSelectedLot(json.data[0].id);
            });
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!selectedLot) return;
        setLoading(true);
        try {
            await onAssign(selectedLot);
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to assign lot');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Overlay>
            <ModalContainer>
                <Title>Assign to Lot</Title>
                <Select value={selectedLot} onChange={e => setSelectedLot(e.target.value)}>
                    <option value="">Select a Lot...</option>
                    {lots.map(lot => (
                        <option key={lot.id} value={lot.id}>
                            {lot.name} {lot.assignedOperator ? `(Op: ${lot.assignedOperator.name})` : '(No Operator)'}
                        </option>
                    ))}
                </Select>
                <ButtonGroup>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={loading || !selectedLot}>
                        {loading ? 'Assigning...' : 'Assign'}
                    </Button>
                </ButtonGroup>
            </ModalContainer>
        </Overlay>
    );
};
