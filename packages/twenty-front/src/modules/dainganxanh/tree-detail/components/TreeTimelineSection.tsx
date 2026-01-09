import styled from '@emotion/styled';

interface TimelineEvent {
    date: string;
    title: string;
    description?: string;
    photoUrl?: string;
    type: 'photo' | 'status' | 'health' | 'milestone';
}

interface TreeTimelineSectionProps {
    events: TimelineEvent[];
}

const StyledSection = styled.div`
  background: ${({ theme }) => theme.background.secondary};
  padding: 24px;
  border-radius: ${({ theme }) => theme.border.radius.md};
  margin-bottom: 24px;
`;

const StyledSectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StyledTimeline = styled.div`
  position: relative;
  padding-left: 24px;

  &::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${({ theme }) => theme.border.color.light};
  }
`;

const StyledTimelineItem = styled.div`
  position: relative;
  padding-bottom: 24px;

  &:last-child {
    padding-bottom: 0;
  }

  &::before {
    content: '';
    position: absolute;
    left: -20px;
    top: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #8BC34A;
    border: 2px solid white;
    box-shadow: 0 0 0 2px #8BC34A;
  }
`;

const StyledEventDate = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.font.color.tertiary};
  margin-bottom: 4px;
`;

const StyledEventTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 4px;
`;

const StyledEventDescription = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.font.color.secondary};
`;

const StyledEventPhoto = styled.img`
  width: 100%;
  max-width: 200px;
  border-radius: ${({ theme }) => theme.border.radius.sm};
  margin-top: 8px;
`;

const StyledEmptyState = styled.div`
  text-align: center;
  padding: 24px;
  color: ${({ theme }) => theme.font.color.tertiary};
`;

export const TreeTimelineSection = ({ events }: TreeTimelineSectionProps) => {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
    };

    if (events.length === 0) {
        return (
            <StyledSection data-testid="tree-timeline-section">
                <StyledSectionTitle>📅 Lịch sử phát triển</StyledSectionTitle>
                <StyledEmptyState>
                    Chưa có sự kiện nào được ghi nhận
                </StyledEmptyState>
            </StyledSection>
        );
    }

    return (
        <StyledSection data-testid="tree-timeline-section">
            <StyledSectionTitle>📅 Lịch sử phát triển</StyledSectionTitle>

            <StyledTimeline>
                {events.map((event, index) => (
                    <StyledTimelineItem key={index}>
                        <StyledEventDate>{formatDate(event.date)}</StyledEventDate>
                        <StyledEventTitle>{event.title}</StyledEventTitle>
                        {event.description && (
                            <StyledEventDescription>{event.description}</StyledEventDescription>
                        )}
                        {event.photoUrl && (
                            <StyledEventPhoto src={event.photoUrl} alt={event.title} />
                        )}
                    </StyledTimelineItem>
                ))}
            </StyledTimeline>
        </StyledSection>
    );
};

export type { TimelineEvent };
