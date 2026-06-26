import { UsersTable } from './users-table';

// /admin/users page (AC6) — Story 2.4.
// Server wrapper → client island UsersTable. Admin protect client-side
// (accessToken in memory — SSR không biết auth state, AD-4 SSR Boundary).
export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">Quản lý người dùng</h1>
      <UsersTable />
    </div>
  );
}
