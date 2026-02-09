# Epic 2 Frontend Implementation Guide

**Status**: Foundation Complete, Components Pending
**Date**: 2025-12-09
**Developer**: Implementation in progress

---

## ✅ COMPLETED FILES (2/12)

### 1. Types Definition
**File**: `/packages/twenty-front/src/modules/real-estate/types/index.ts`
**Status**: ✅ Complete
**Lines**: 60

Defines TypeScript interfaces for:
- `Project` - Real estate project entity
- `Property` - Individual property/plot entity
- `DashboardStats` - Analytics data structure
- `RecentProperty` - Property with actions
- `ProjectFile` - File attachments

### 2. Mock Data
**File**: `/packages/twenty-front/src/modules/real-estate/data/mock-data.ts`
**Status**: ✅ Complete
**Lines**: 150

Contains:
- `mockProjects` - 3 sample projects
- `mockProperties` - 8 sample properties
- `mockDashboardStats` - Dashboard metrics
- `mockRecentProperties` - Quick access list
- `mockProjectFiles` - 6 sample files

---

## 🔨 PENDING COMPONENTS (10/12)

### 3. ProjectsTable Component
**File**: `/packages/twenty-front/src/modules/real-estate/components/ProjectsTable.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 120

**Purpose**: Render projects list view with table layout

**Props**:
```typescript
interface ProjectsTableProps {
  projects: Project[];
  onProjectClick: (projectId: string) => void;
}
```

**Features**:
- Table header with columns
- Search input
- Status badges
- Click to navigate to detail

**Implementation Template**:
```tsx
import styled from '@emotion/styled';
import { Project } from '../types';

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StatusBadge = styled.span<{ status: string }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  background: ${({ status }) =>
    status === 'ACTIVE' ? '#22c55e20' : '#eab30820'};
  color: ${({ status }) =>
    status === 'ACTIVE' ? '#22c55e' : '#eab308'};
`;

export const ProjectsTable = ({ projects, onProjectClick }: ProjectsTableProps) => {
  return (
    <Table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Location</th>
          <th>Status</th>
          <th>Total</th>
          <th>Available</th>
          <th>Price From</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr key={project.id} onClick={() => onProjectClick(project.id)}>
            <td>{project.name}</td>
            <td>{project.location}</td>
            <td>
              <StatusBadge status={project.status}>
                {project.status}
              </StatusBadge>
            </td>
            <td>{project.totalProperties}</td>
            <td>{project.availableProperties}</td>
            <td>{(project.priceFrom / 1_000_000_000).toFixed(1)}B VND</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
```

### 4. ProjectDetailTabs Component
**File**: `/packages/twenty-front/src/modules/real-estate/components/ProjectDetailTabs.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 200

**Purpose**: Project detail with tabbed interface

**Tabs**:
1. Overview - Basic info
2. Properties - Grid of properties
3. Master Plan - Image viewer
4. Files - File list
5. Activities - Placeholder

**Implementation Template**:
```tsx
import { useState } from 'react';
import styled from '@emotion/styled';
import { Project, Property } from '../types';

interface ProjectDetailTabsProps {
  project: Project;
  properties: Property[];
}

export const ProjectDetailTabs = ({ project, properties }: ProjectDetailTabsProps) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <Container>
      <TabBar>
        <Tab active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
          Overview
        </Tab>
        <Tab active={activeTab === 'properties'} onClick={() => setActiveTab('properties')}>
          Properties ({properties.length})
        </Tab>
        <Tab active={activeTab === 'masterplan'} onClick={() => setActiveTab('masterplan')}>
          Master Plan
        </Tab>
        <Tab active={activeTab === 'files'} onClick={() => setActiveTab('files')}>
          Files
        </Tab>
        <Tab active={activeTab === 'activities'} onClick={() => setActiveTab('activities')}>
          Activities
        </Tab>
      </TabBar>

      <TabContent>
        {activeTab === 'overview' && <OverviewTab project={project} />}
        {activeTab === 'properties' && <PropertiesTab properties={properties} />}
        {activeTab === 'masterplan' && <MasterPlanTab />}
        {activeTab === 'files' && <FilesTab />}
        {activeTab === 'activities' && <div>Activities feature coming in Epic 7</div>}
      </TabContent>
    </Container>
  );
};
```

### 5. PropertyGallery Component
**File**: `/packages/twenty-front/src/modules/real-estate/components/PropertyGallery.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 100

**Features**:
- Main image display
- Thumbnail strip
- Previous/Next navigation

### 6. DashboardStats Component
**File**: `/packages/twenty-front/src/modules/real-estate/components/DashboardStats.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 150

**Features**:
- KPI cards grid
- Stats visualization
- Recent properties table

### 7. ReservationModal Component
**File**: `/packages/twenty-front/src/modules/real-estate/components/ReservationModal.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 120

**Features**:
- Modal dialog
- Property summary
- 24h countdown timer
- Confirm/Cancel actions

---

## 📄 PAGE COMPONENTS (4 files)

### 8. ProjectsListPage
**File**: `/packages/twenty-front/src/pages/real-estate/ProjectsListPage.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 80

```tsx
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/ui/layout/page/components/PageContainer';
import { ProjectsTable } from '@/modules/real-estate/components/ProjectsTable';
import { mockProjects } from '@/modules/real-estate/data/mock-data';

export const ProjectsListPage = () => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <h1>Projects</h1>
      <p>{mockProjects.length} projects</p>
      <ProjectsTable
        projects={mockProjects}
        onProjectClick={(id) => navigate(`/real-estate/projects/${id}`)}
      />
    </PageContainer>
  );
};
```

### 9. ProjectDetailPage
**File**: `/packages/twenty-front/src/pages/real-estate/ProjectDetailPage.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 100

### 10. PropertyDetailPage
**File**: `/packages/twenty-front/src/pages/real-estate/PropertyDetailPage.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 100

### 11. DashboardPage
**File**: `/packages/twenty-front/src/pages/real-estate/DashboardPage.tsx`
**Status**: ⏳ Pending
**Estimated Lines**: 80

---

## 🛣️ ROUTER INTEGRATION

### 12. Router Update
**File**: `/packages/twenty-front/src/modules/app/hooks/useCreateAppRouter.tsx`
**Status**: ⏳ Pending
**Modification**: Add routes

**Changes Needed**:
```typescript
// Add imports at top
import { ProjectsListPage } from '~/pages/real-estate/ProjectsListPage';
import { ProjectDetailPage } from '~/pages/real-estate/ProjectDetailPage';
import { PropertyDetailPage } from '~/pages/real-estate/PropertyDetailPage';
import { DashboardPage } from '~/pages/real-estate/DashboardPage';

// Add routes inside DefaultLayout
<Route path="/real-estate/projects" element={<ProjectsListPage />} />
<Route path="/real-estate/projects/:id" element={<ProjectDetailPage />} />
<Route path="/real-estate/properties/:id" element={<PropertyDetailPage />} />
<Route path="/real-estate/dashboard" element={<DashboardPage />} />
```

---

## 🎨 STYLING GUIDELINES

### Color Palette
```typescript
const colors = {
  background: '#0d0d0d',
  surface: '#1a1a1a',
  border: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  statusAvailable: '#22c55e',
  statusReserved: '#eab308',
  statusDeposit: '#f97316',
  statusSold: '#991b1b',
};
```

### Component Patterns
```typescript
import styled from '@emotion/styled';

const Card = styled.div`
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  padding: 24px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  border: none;
  cursor: pointer;

  &:hover {
    background: #2563eb;
  }
`;
```

---

## 📊 PROGRESS TRACKER

| Task | Status | Lines | Priority |
|------|--------|-------|----------|
| Types | ✅ | 60 | Critical |
| Mock Data | ✅ | 150 | Critical |
| ProjectsTable | ⏳ | 120 | High |
| ProjectDetailTabs | ⏳ | 200 | High |
| PropertyGallery | ⏳ | 100 | Medium |
| DashboardStats | ⏳ | 150 | Medium |
| ReservationModal | ⏳ | 120 | High |
| ProjectsListPage | ⏳ | 80 | High |
| ProjectDetailPage | ⏳ | 100 | High |
| PropertyDetailPage | ⏳ | 100 | Medium |
| DashboardPage | ⏳ | 80 | Medium |
| Router Update | ⏳ | 40 | Critical |
| **TOTAL** | **17%** | **1300** | - |

---

## 🚀 NEXT STEPS

1. **Create Component Files** (Priority: High)
   - ProjectsTable.tsx
   - ProjectDetailTabs.tsx
   - ReservationModal.tsx

2. **Create Page Files** (Priority: High)
   - ProjectsListPage.tsx
   - ProjectDetailPage.tsx

3. **Update Router** (Priority: Critical)
   - Add routes to useCreateAppRouter.tsx

4. **Test Navigation** (Priority: High)
   - Verify all routes work
   - Test transitions between pages

5. **Create Remaining Components** (Priority: Medium)
   - PropertyGallery.tsx
   - DashboardStats.tsx
   - PropertyDetailPage.tsx
   - DashboardPage.tsx

---

## 🧪 TESTING PLAN

**Manual Testing**:
1. Navigate to `/real-estate/projects`
2. Click on a project
3. Navigate through tabs
4. Click on a property
5. Open reservation modal
6. Navigate to dashboard

**Expected Behavior**:
- All pages render without errors
- Navigation works smoothly
- Data displays correctly
- Styling matches mockup

---

## 📝 IMPLEMENTATION NOTES

**Technology Choices**:
- **Styling**: `@emotion/styled` (Twenty's preference)
- **Routing**: `react-router-dom` v6
- **State**: React hooks (`useState`, `useNavigate`, `useParams`)
- **TypeScript**: Strict mode enabled

**Best Practices**:
- Component composition
- Type safety with TypeScript
- Consistent naming conventions
- Reusable styled components
- Mock data separation

---

**Last Updated**: 2025-12-09
**Completion**: 17% (2/12 files)
**Next Session**: Continue with component creation
