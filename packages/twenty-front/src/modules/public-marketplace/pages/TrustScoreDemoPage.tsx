import styled from '@emotion/styled';
import { EnhancedTrustScore } from '../components/EnhancedTrustScore';
import { enhancedTrustScoreBreakdowns } from '../data/enhanced-trust-score-data';

const Container = styled.div`
  min-height: 100vh;
  background-color: ${({ theme }) => theme.background.primary};
  padding: 2rem;
`;

const MaxWidth = styled.div`
  margin: 0 auto;
  max-width: 1200px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.font.color.secondary};
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const DemoSection = styled.div`
  margin-bottom: 3rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme }) => theme.font.color.primary};
  margin-bottom: 1rem;
`;

export const TrustScoreDemoPage = () => {
  return (
    <Container>
      <MaxWidth>
        <Title>🎯 Enhanced Trust Score System Demo</Title>
        <Description>
          Hệ thống đánh giá Trust Score nâng cao với 10 tiêu chí (tăng từ 6 tiêu
          chí ban đầu), bao gồm 7 tiêu chí mới được powered by AI để đánh giá
          bất động sản toàn diện hơn.
        </Description>

        <DemoSection>
          <SectionTitle>
            Listing 1: Premium Property (96/100 - Excellent Trust)
          </SectionTitle>
          <EnhancedTrustScore
            score={96}
            breakdown={enhancedTrustScoreBreakdowns['listing-1']}
          />
        </DemoSection>

        <DemoSection>
          <SectionTitle>
            Listing 2: Standard Property (79/100 - Good Trust)
          </SectionTitle>
          <EnhancedTrustScore
            score={79}
            breakdown={enhancedTrustScoreBreakdowns['listing-2']}
          />
        </DemoSection>

        <DemoSection>
          <SectionTitle>
            Listing 3: Luxury Property (98/100 - Excellent Trust)
          </SectionTitle>
          <EnhancedTrustScore
            score={98}
            breakdown={enhancedTrustScoreBreakdowns['listing-3']}
          />
        </DemoSection>
      </MaxWidth>
    </Container>
  );
};
