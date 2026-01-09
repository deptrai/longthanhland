import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

import { TreeCard, TreeStatus } from './TreeCard';
import { TreeCardSkeleton } from './TreeCardSkeleton';
import { EmptyGardenState } from './EmptyGardenState';
import { useUserTrees } from '../hooks/useUserTrees';
import { ReferralWidget } from '../../referral/components/ReferralWidget';

const StyledDashboard = styled.div`
  padding: 24px;
`;

const StyledHeader = styled.div`
  margin-bottom: 24px;
`;

const StyledTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 8px;
`;

const StyledSummaryBar = styled.div`
  display: flex;
  gap: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.background.secondary};
  border-radius: ${({ theme }) => theme.border.radius.md};
  margin-bottom: 24px;
`;

const StyledStat = styled.div`
  text-align: center;
`;

const StyledStatValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: #2D5016;
`;

const StyledStatLabel = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const StyledControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
`;

const StyledFilterTabs = styled.div`
  display: flex;
  gap: 8px;
`;

const StyledFilterTab = styled.button<{ isActive: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${({ isActive }) => (isActive ? '#2D5016' : '#E0E0E0')};
  background: ${({ isActive }) => (isActive ? '#2D5016' : 'transparent')};
  color: ${({ isActive }) => (isActive ? 'white' : '#666')};
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #2D5016;
  }
`;

const StyledSortSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.border.color.light};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-size: 14px;
  cursor: pointer;
`;

const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 16px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const StyledError = styled.div`
  padding: 24px;
  text-align: center;
  color: ${({ theme }) => theme.color.red};
`;

const filterOptions: Array<{ value: TreeStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SEEDLING', label: '🌱 Cây con' },
  { value: 'GROWING', label: '🌿 Đang lớn' },
  { value: 'MATURE', label: '🌳 Trưởng thành' },
  { value: 'HARVESTED', label: '🍃 Thu hoạch' },
];

export const MyGardenDashboard = () => {
  const navigate = useNavigate();
  const {
    trees,
    isLoading,
    error,
    filter,
    setFilter,
    sortField,
    sortDirection,
    setSort,
    refresh,
  } = useUserTrees();

  const totalCO2 = trees.reduce((sum, tree) => sum + tree.co2Absorbed, 0);
  const avgAge = trees.length > 0
    ? Math.round(trees.reduce((sum, tree) => {
      const days = (Date.now() - new Date(tree.plantingDate).getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0) / trees.length)
    : 0;

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [field, direction] = e.target.value.split('-');
    setSort(field, direction as 'asc' | 'desc');
  };

  if (error) {
    return (
      <StyledError>
        <p>Đã xảy ra lỗi: {error.message}</p>
        <button onClick={refresh}>Thử lại</button>
      </StyledError>
    );
  }

  return (
    <StyledDashboard data-testid="my-garden-dashboard">
      <StyledHeader>
        <StyledTitle>🌿 Vườn Của Tôi</StyledTitle>
      </StyledHeader>

      <StyledSummaryBar>
        <StyledStat>
          <StyledStatValue>{trees.length}</StyledStatValue>
          <StyledStatLabel>Tổng số cây</StyledStatLabel>
        </StyledStat>
        <StyledStat>
          <StyledStatValue>{totalCO2.toFixed(1)}</StyledStatValue>
          <StyledStatLabel>kg CO₂/năm</StyledStatLabel>
        </StyledStat>
        <StyledStat>
          <StyledStatValue>{avgAge}</StyledStatValue>
          <StyledStatLabel>ngày tuổi TB</StyledStatLabel>
        </StyledStat>
      </StyledSummaryBar>

      {/* Referral Widget */}
      <ReferralWidget />

      <StyledControls>
        <StyledFilterTabs>
          {filterOptions.map((option) => (
            <StyledFilterTab
              key={option.value}
              isActive={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </StyledFilterTab>
          ))}
        </StyledFilterTabs>

        <StyledSortSelect
          value={`${sortField}-${sortDirection}`}
          onChange={handleSortChange}
        >
          <option value="plantingDate-desc">Mới nhất</option>
          <option value="plantingDate-asc">Cũ nhất</option>
          <option value="treeCode-asc">Mã A-Z</option>
          <option value="treeCode-desc">Mã Z-A</option>
          <option value="status-asc">Trạng thái</option>
        </StyledSortSelect>
      </StyledControls>

      {isLoading ? (
        <StyledGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <TreeCardSkeleton key={i} />
          ))}
        </StyledGrid>
      ) : trees.length === 0 ? (
        <EmptyGardenState />
      ) : (
        <StyledGrid>
          {trees.map((tree) => (
            <TreeCard
              key={tree.id}
              tree={tree}
              onClick={() => navigate(`/trees/${tree.id}`)}
            />
          ))}
        </StyledGrid>
      )}
    </StyledDashboard>
  );
};
