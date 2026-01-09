import styled from '@emotion/styled';

export const StyledButton = styled.button<{
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    fullWidth?: boolean;
}>`
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
    opacity: ${({ disabled }) => disabled ? 0.5 : 1};
    border: none;
    transition: all 0.2s;
    width: ${({ fullWidth }) => fullWidth ? '100%' : 'auto'};
    
    ${({ variant }) => variant === 'primary' ? `
        background: #10b981;
        color: white;
        &:hover:not(:disabled) { background: #059669; }
    ` : `
        background: #e2e8f0;
        color: #475569;
        &:hover:not(:disabled) { background: #cbd5e1; }
    `}
`;

export { StyledButton as Button };
