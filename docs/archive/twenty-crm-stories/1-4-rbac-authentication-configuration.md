# Story 1.4: RBAC & Authentication Configuration

Status: drafted

## Story

As an **Admin**,
I want role-based access control configured,
so that different user types have appropriate permissions.

## Acceptance Criteria

| AC ID | Given | When | Then | Verification |
|-------|-------|------|------|--------------|
| AC-1.4.1 | Admin role | Login as Admin | Full access to all modules | Admin can CRUD all entities |
| AC-1.4.2 | Sales Agent role | Access Commission module | View-only access | Cannot edit commissions |
| AC-1.4.3 | Finance role | Access Property module | Access denied | 403 on property endpoints |
| AC-1.4.4 | Manager role | Access Reports | Read access granted | Can view, cannot edit |
| AC-1.4.5 | JWT token | After 7 days | Token expires | Must re-authenticate |

---

## Backend Tasks

### BE-1: Understand Twenty's Permission System (AC: 1-4)

Twenty CRM uses a built-in permission system. Research and document:

```typescript
// Twenty's permission structure (existing)
// Located in: packages/twenty-server/src/engine/core-modules/workspace/

// Key concepts:
// 1. Workspace - tenant isolation
// 2. WorkspaceMember - user in workspace with role
// 3. ObjectPermission - per-object CRUD permissions
// 4. FieldPermission - per-field read/write permissions
```

**Research Tasks**:
- [ ] Review `packages/twenty-server/src/engine/core-modules/workspace/`
- [ ] Review `packages/twenty-server/src/engine/core-modules/auth/`
- [ ] Document existing permission model
- [ ] Identify extension points for custom roles

### BE-2: Create Custom Role Definitions (AC: 1-4)

> **IMPORTANT**: Twenty already has a built-in RBAC system with standard roles. We extend it by adding custom roles for real estate.

**Twenty's Existing Roles** (in `src/engine/workspace-manager/workspace-sync-metadata/standard-roles/`):
- `ADMIN_ROLE` - Full access
- `WORKFLOW_MANAGER_ROLE` - Workflow management
- `DATA_MANIPULATOR_ROLE` - Data manipulation
- `DASHBOARD_MANAGER_ROLE` - Dashboard management
- `DATA_MODEL_MANAGER_ROLE` - Data model management

**File**: `packages/twenty-server/src/modules/real-estate/roles/sales-agent-role.ts`

```typescript
import { type StandardRoleDefinition } from 'src/engine/workspace-manager/workspace-sync-metadata/standard-roles/types/standard-role-definition.interface';

/**
 * Sales Agent Role for Real Estate module
 *
 * Permissions:
 * - Read projects and properties
 * - Reserve properties
 * - View own commissions and leads
 */
export const SALES_AGENT_ROLE: StandardRoleDefinition = {
  standardId: '20202020-0001-0001-0001-000000000010', // Custom range for real estate
  label: 'Sales Agent',
  description: 'Sales agent with limited access to real estate operations',
  icon: 'IconUser',
  isEditable: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canReadAllObjectRecords: false, // Will use object-level permissions
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  canBeAssignedToApplications: false,
  applicationId: null,
};
```

**File**: `packages/twenty-server/src/modules/real-estate/roles/finance-role.ts`

```typescript
import { type StandardRoleDefinition } from 'src/engine/workspace-manager/workspace-sync-metadata/standard-roles/types/standard-role-definition.interface';

/**
 * Finance Role for Real Estate module
 *
 * Permissions:
 * - Full access to commissions
 * - Export reports
 * - No access to properties/projects
 */
export const FINANCE_ROLE: StandardRoleDefinition = {
  standardId: '20202020-0001-0001-0001-000000000011',
  label: 'Finance',
  description: 'Finance user with commission management access',
  icon: 'IconCash',
  isEditable: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  canBeAssignedToApplications: false,
  applicationId: null,
};
```

**File**: `packages/twenty-server/src/modules/real-estate/roles/manager-role.ts`

```typescript
import { type StandardRoleDefinition } from 'src/engine/workspace-manager/workspace-sync-metadata/standard-roles/types/standard-role-definition.interface';

/**
 * Manager Role for Real Estate module
 *
 * Permissions:
 * - Read access to all modules
 * - Full access to reports
 */
export const MANAGER_ROLE: StandardRoleDefinition = {
  standardId: '20202020-0001-0001-0001-000000000012',
  label: 'Manager',
  description: 'Manager with read-only access and full reports',
  icon: 'IconUserCheck',
  isEditable: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canReadAllObjectRecords: true, // Read-only access to all
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  canBeAssignedToApplications: false,
  applicationId: null,
};
```

**File**: `packages/twenty-server/src/modules/real-estate/roles/index.ts`

```typescript
export * from './sales-agent-role';
export * from './finance-role';
export * from './manager-role';

import { SALES_AGENT_ROLE } from './sales-agent-role';
import { FINANCE_ROLE } from './finance-role';
import { MANAGER_ROLE } from './manager-role';

export const REAL_ESTATE_ROLES = [
  SALES_AGENT_ROLE,
  FINANCE_ROLE,
  MANAGER_ROLE,
] as const;
```

> **Note**: These roles follow Twenty's `StandardRoleDefinition` interface. Object-level permissions (which objects each role can access) will be configured separately.

**Subtasks**:
- [ ] Create `roles/` directory in real-estate module
- [ ] Create sales-agent-role.ts
- [ ] Create finance-role.ts
- [ ] Create manager-role.ts
- [ ] Create index.ts to export all roles
- [ ] Register roles with Twenty's role system

### BE-3: Create Permission Guard (AC: 1-4)

**File**: `packages/twenty-server/src/modules/real-estate/guards/real-estate-permission.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RealEstateRole, ROLE_DEFINITIONS, Permission } from '../constants/roles';

export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  module: 'projects' | 'properties' | 'commissions' | 'leads' | 'reports';
  action: 'READ' | 'WRITE' | 'DELETE';
}

export const RequirePermission = (permission: RequiredPermission) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);

@Injectable()
export class RealEstatePermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<RequiredPermission>(
      REQUIRED_PERMISSION_KEY,
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true; // No permission required
    }

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User role not found');
    }

    const roleDefinition = ROLE_DEFINITIONS.find(r => r.role === user.role);
    if (!roleDefinition) {
      throw new ForbiddenException('Invalid role');
    }

    const modulePermission = roleDefinition.permissions[requiredPermission.module];

    return this.checkPermission(modulePermission, requiredPermission.action, user);
  }

  private checkPermission(
    permission: Permission,
    action: string,
    user: any,
  ): boolean {
    switch (permission) {
      case 'FULL':
        return true;
      case 'READ':
        return action === 'READ';
      case 'OWN_ONLY':
        // Will be checked at data level
        return true;
      case 'NONE':
        throw new ForbiddenException('Access denied');
      default:
        return false;
    }
  }
}
```

**Subtasks**:
- [ ] Create guard file
- [ ] Implement CanActivate interface
- [ ] Add RequirePermission decorator
- [ ] Handle FULL, READ, OWN_ONLY, NONE permissions
- [ ] Return 403 for unauthorized access

### BE-4: Configure JWT Settings (AC: 5)

**File**: `packages/twenty-server/.env` (MODIFY)

```env
# JWT Configuration
ACCESS_TOKEN_SECRET=your-access-token-secret-min-32-chars
ACCESS_TOKEN_EXPIRES_IN=7d

LOGIN_TOKEN_SECRET=your-login-token-secret-min-32-chars
LOGIN_TOKEN_EXPIRES_IN=15m

REFRESH_TOKEN_SECRET=your-refresh-token-secret-min-32-chars
REFRESH_TOKEN_EXPIRES_IN=30d

FILE_TOKEN_SECRET=your-file-token-secret-min-32-chars
FILE_TOKEN_EXPIRES_IN=1d
```

**Subtasks**:
- [ ] Set ACCESS_TOKEN_EXPIRES_IN to 7d
- [ ] Generate secure random secrets (32+ chars)
- [ ] Configure refresh token for 30 days
- [ ] Verify token configuration in auth module

### BE-5: Add Role Field to User (AC: 1-4)

**[ASSUMPTION: Twenty may already have role field. If not, extend User entity]**

```typescript
// If Twenty doesn't have role field, add extension:
// packages/twenty-server/src/modules/real-estate/extensions/user-role.extension.ts

import { WorkspaceField } from '@/engine/decorators';
import { FieldMetadataType } from '@/engine/types';

// This would extend Twenty's User/WorkspaceMember with role field
// Actual implementation depends on Twenty's extension mechanism
```

**Subtasks**:
- [ ] Check if Twenty has built-in role field
- [ ] If not, create extension for role field
- [ ] Add role options: ADMIN, SALES_AGENT, FINANCE, MANAGER

---

## Database Tasks

### DB-1: Seed Test Users (AC: 1-4)

**File**: `packages/twenty-server/src/database/seeds/real-estate-users.seed.ts`

```typescript
import { DataSource } from 'typeorm';

export async function seedRealEstateUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository('workspace_member');

  const testUsers = [
    {
      email: 'admin@realestate.test',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
    {
      email: 'sales@realestate.test',
      firstName: 'Sales',
      lastName: 'Agent',
      role: 'SALES_AGENT',
    },
    {
      email: 'finance@realestate.test',
      firstName: 'Finance',
      lastName: 'User',
      role: 'FINANCE',
    },
    {
      email: 'manager@realestate.test',
      firstName: 'Manager',
      lastName: 'User',
      role: 'MANAGER',
    },
  ];

  for (const user of testUsers) {
    // Create or update user
    // Password: 'password123' (hashed)
  }
}
```

**Subtasks**:
- [ ] Create seed file
- [ ] Add 4 test users with different roles
- [ ] Run seed: `npx nx database:seed twenty-server`

---

## API Tasks

### API-1: Test Admin Access (AC: 1)

```graphql
# Login as admin
mutation Login {
  login(email: "admin@realestate.test", password: "password123") {
    accessToken
    refreshToken
  }
}

# Test full access - should succeed
query AdminTestProjects {
  projects { edges { node { id name } } }
}

mutation AdminTestCreateProject {
  createProject(data: { name: "Test Project" }) { id }
}

mutation AdminTestDeleteProject {
  deleteProject(id: "xxx") { id }
}
```

**Subtasks**:
- [ ] Login as admin
- [ ] Test read access to all modules
- [ ] Test write access to all modules
- [ ] Test delete access

### API-2: Test Sales Agent Restrictions (AC: 2)

```graphql
# Login as sales agent
mutation Login {
  login(email: "sales@realestate.test", password: "password123") {
    accessToken
  }
}

# Test read access - should succeed
query SalesTestProjects {
  projects { edges { node { id name } } }
}

# Test write access - should fail with 403
mutation SalesTestCreateProject {
  createProject(data: { name: "Test" }) { id }
}
# Expected: ForbiddenException

# Test commission view - should only see own
query SalesTestCommissions {
  commissions { edges { node { id amount } } }
}
# Expected: Only commissions where salesAgentId = current user
```

**Subtasks**:
- [ ] Login as sales agent
- [ ] Verify read access to projects/properties
- [ ] Verify 403 on create/update/delete
- [ ] Verify only own commissions visible

### API-3: Test Finance Restrictions (AC: 3)

```graphql
# Login as finance
mutation Login {
  login(email: "finance@realestate.test", password: "password123") {
    accessToken
  }
}

# Test property access - should fail
query FinanceTestProperties {
  properties { edges { node { id } } }
}
# Expected: ForbiddenException

# Test commission access - should succeed
query FinanceTestCommissions {
  commissions { edges { node { id amount status } } }
}

mutation FinanceApproveCommission {
  approveCommission(id: "xxx") { id status }
}
```

**Subtasks**:
- [ ] Login as finance
- [ ] Verify 403 on property access
- [ ] Verify full access to commissions
- [ ] Test approve/reject mutations

### API-4: Test Token Expiry (AC: 5)

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(email: \"admin@realestate.test\", password: \"password123\") { accessToken } }"}' \
  | jq -r '.data.login.accessToken')

# Decode token to check expiry
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.exp'
# Should be ~7 days from now

# Test with expired token (mock)
# In production, wait 7 days or use test token with short expiry
```

**Subtasks**:
- [ ] Get access token
- [ ] Verify expiry is 7 days
- [ ] Test refresh token flow
- [ ] Verify 401 on expired token

---

## Testing Tasks

### TEST-1: Permission Guard Unit Tests

**File**: `packages/twenty-server/src/modules/real-estate/guards/__tests__/permission.guard.spec.ts`

```typescript
describe('RealEstatePermissionGuard', () => {
  describe('Admin role', () => {
    it('should allow all actions', () => {
      const user = { role: 'ADMIN' };
      expect(guard.canActivate(mockContext(user, 'projects', 'WRITE'))).toBe(true);
      expect(guard.canActivate(mockContext(user, 'commissions', 'DELETE'))).toBe(true);
    });
  });

  describe('Sales Agent role', () => {
    it('should allow read on projects', () => {
      const user = { role: 'SALES_AGENT' };
      expect(guard.canActivate(mockContext(user, 'projects', 'READ'))).toBe(true);
    });

    it('should deny write on projects', () => {
      const user = { role: 'SALES_AGENT' };
      expect(() => guard.canActivate(mockContext(user, 'projects', 'WRITE')))
        .toThrow(ForbiddenException);
    });
  });

  describe('Finance role', () => {
    it('should deny access to properties', () => {
      const user = { role: 'FINANCE' };
      expect(() => guard.canActivate(mockContext(user, 'properties', 'READ')))
        .toThrow(ForbiddenException);
    });

    it('should allow full access to commissions', () => {
      const user = { role: 'FINANCE' };
      expect(guard.canActivate(mockContext(user, 'commissions', 'WRITE'))).toBe(true);
    });
  });
});
```

**Subtasks**:
- [ ] Create test file
- [ ] Test Admin permissions
- [ ] Test Sales Agent permissions
- [ ] Test Finance permissions
- [ ] Test Manager permissions
- [ ] Run tests

### TEST-2: Integration Tests

**File**: `packages/twenty-server/src/modules/real-estate/__tests__/rbac.integration.spec.ts`

```typescript
describe('RBAC Integration', () => {
  it('should return 403 for unauthorized access', async () => {
    const salesToken = await loginAs('sales@realestate.test');

    const result = await graphqlRequest(
      `mutation { createProject(data: { name: "Test" }) { id } }`,
      salesToken
    );

    expect(result.errors[0].extensions.code).toBe('FORBIDDEN');
  });

  it('should filter own data for OWN_ONLY permission', async () => {
    const salesToken = await loginAs('sales@realestate.test');

    const result = await graphqlRequest(
      `query { commissions { edges { node { id salesAgentId } } } }`,
      salesToken
    );

    // All returned commissions should belong to current user
    result.data.commissions.edges.forEach(edge => {
      expect(edge.node.salesAgentId).toBe(currentUserId);
    });
  });
});
```

**Subtasks**:
- [ ] Create integration test file
- [ ] Test 403 responses
- [ ] Test data filtering for OWN_ONLY
- [ ] Run integration tests

---

## Definition of Done

- [ ] Role definitions created
- [ ] Permission guard implemented
- [ ] JWT expiry set to 7 days
- [ ] Test users seeded
- [ ] Admin has full access
- [ ] Sales Agent has restricted access
- [ ] Finance cannot access properties
- [ ] Manager has read-only access
- [ ] Token expiry works correctly
- [ ] Unit tests passing
- [ ] Integration tests passing

---

## Dev Notes

### RBAC Matrix

| Module | Admin | Sales Agent | Finance | Manager |
|--------|-------|-------------|---------|---------|
| Projects | FULL | READ | NONE | READ |
| Properties | FULL | READ + Reserve | NONE | READ |
| Commissions | FULL | OWN_ONLY (View) | FULL | READ |
| Leads | FULL | OWN_ONLY | NONE | READ |
| Reports | FULL | OWN_ONLY | READ + Export | FULL |

### Architecture Patterns
- **Guard Pattern**: NestJS CanActivate for permission checks
- **Decorator Pattern**: @RequirePermission for declarative permissions
- **Row-Level Security**: OWN_ONLY filters data at query level

### References
- [Source: architecture.md#Security-Architecture lines 646-666]
- [Source: architecture.md#Authorization-RBAC lines 653-660]
- [Source: tech-spec-epic-1.md#Story-1.4]

---

## Dev Agent Record

### Context Reference

### Agent Model Used
Claude 3.5 Sonnet (Cascade)

### Debug Log References

### Completion Notes List

### File List
- packages/twenty-server/src/modules/real-estate/constants/roles.ts
- packages/twenty-server/src/modules/real-estate/guards/real-estate-permission.guard.ts
- packages/twenty-server/src/database/seeds/real-estate-users.seed.ts
- packages/twenty-server/src/modules/real-estate/guards/__tests__/permission.guard.spec.ts
- packages/twenty-server/src/modules/real-estate/__tests__/rbac.integration.spec.ts
- packages/twenty-server/.env (modified)
