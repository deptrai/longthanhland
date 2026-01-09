import styled from '@emotion/styled';
import React, { useRef } from 'react';
import { Button } from 'twenty-ui/input';

const Container = styled.div`
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    padding: 48px 24px;
    text-align: center;
    background: #f8fafc;
    transition: all 0.2s;
    cursor: pointer;

    &:hover {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    &.drag-over {
        border-color: #3b82f6;
        background: #dbeafe;
    }
`;

const Icon = styled.div`
    font-size: 48px;
    margin-bottom: 16px;
`;

const Title = styled.h3`
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
`;

const Description = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: #64748b;
`;

const HiddenInput = styled.input`
    display: none;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
`;

interface FileSelectorProps {
    onFilesSelected: (files: FileList) => void;
    accept?: string;
    multiple?: boolean;
}

export const FileSelector = ({
    onFilesSelected,
    accept = 'image/*',
    multiple = true,
}: FileSelectorProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = React.useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelected(e.dataTransfer.files);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleCameraClick = () => {
        cameraInputRef.current?.click();
    };

    return (
        <Container
            className={isDragOver ? 'drag-over' : ''}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <Icon>📸</Icon>
            <Title>Upload Photos</Title>
            <Description>
                Drag and drop photos here, or click to select files
            </Description>

            <ButtonGroup onClick={(e) => e.stopPropagation()}>
                <Button variant="primary" onClick={handleClick}>
                    Select Files
                </Button>
                <Button variant="secondary" onClick={handleCameraClick}>
                    📷 Camera
                </Button>
            </ButtonGroup>

            <HiddenInput
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileSelect}
            />

            <HiddenInput
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
            />
        </Container>
    );
};
