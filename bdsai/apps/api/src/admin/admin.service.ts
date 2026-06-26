import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { count, desc, eq, ilike, or } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../db/database.tokens';
import { publicUsers } from '../db/schema/public-users';
import { userAuditLogs } from '../db/schema/user-audit-logs';

// AdminService (AC1, AC2, AC3, AD-2, AD-8) — Story 2.4.
//
// Business logic cho admin user management:
//   - listUsers(): paginated list + search (Drizzle parameterized ilike).
//   - banUser(): set banned=true (self-ban + ban-admin guard).
//   - unbanUser(): set banned=false.
//
// AD-2: mutation qua NestJS Service → Drizzle. AD-8: KHÔNG log email/phone raw
// (pino redact *.email, *.phone đã có). Search term KHÔNG log raw (PII).

export interface AdminUserItem {
  id: string;
  email: string;
  phone: string;
  role: string;
  banned: boolean;
  createdAt: Date;
}

export interface ListUsersResponse {
  data: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
  ) {}

  // AC1: GET /admin/users — paginated list + search.
  async listUsers(dto: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<ListUsersResponse> {
    const { page, limit, search } = dto;
    const offset = (page - 1) * limit;

    // Build where clause: search ? or(ilike email, ilike phone) : undefined.
    // Drizzle ilike parameterized (R5 — KHÔNG string concat, SQL injection safe).
    const where = search
      ? or(
          ilike(publicUsers.email, `%${search}%`),
          ilike(publicUsers.phone, `%${search}%`),
        )
      : undefined;

    let data: AdminUserItem[];
    let total: number;
    try {
      [data, total] = await Promise.all([
        this.db
          .select({
            id: publicUsers.id,
            email: publicUsers.email,
            phone: publicUsers.phone,
            role: publicUsers.role,
            banned: publicUsers.banned,
            createdAt: publicUsers.createdAt,
          })
          .from(publicUsers)
          .where(where)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(publicUsers.createdAt)),
        this.db
          .select({ value: count() })
          .from(publicUsers)
          .where(where)
          .then((rows) => Number(rows[0]?.value ?? 0)),
      ]);
    } catch (e) {
      this.logger.error(
        {
          action: 'list-users',
          adminId: 'unknown',
          page,
          limit,
          searchProvided: Boolean(search),
          reason: 'db-fail',
          err: this.safeErr(e),
        },
        'listUsers DB query thất bại',
      );
      throw new InternalServerErrorException('Lỗi truy vấn danh sách người dùng');
    }

    // AC8: log chỉ searchProvided true/false (KHÔNG log search term raw — PII).
    this.logger.log(
      {
        action: 'list-users',
        reason: 'success',
        page,
        limit,
        searchProvided: Boolean(search),
        resultCount: data.length,
        total,
      },
      'Admin list users',
    );

    return { data, total, page, limit };
  }

  // AC2: POST /admin/users/:id/ban — set banned=true.
  async banUser(targetId: string, adminId: string): Promise<AdminUserItem> {
    // E4: self-ban → 400 (R1 — prevent admin lockout).
    if (targetId === adminId) {
      this.logger.warn(
        { action: 'ban', targetId, adminId, reason: 'self-ban' },
        'Admin tự khóa mình — từ chối',
      );
      throw new BadRequestException('Không thể khóa chính mình');
    }

    const target = await this.findUserOrThrow(targetId);

    // E5: ban admin → 400 (R2 — prevent mutual ban).
    if (target.role === 'admin') {
      this.logger.warn(
        { action: 'ban', targetId, adminId, reason: 'ban-admin' },
        'Khóa admin khác — từ chối',
      );
      throw new BadRequestException('Không thể khóa quản trị viên');
    }

    // E7: idempotent — banned already true → vẫn 200 (no-op update).
    try {
      await this.db
        .update(publicUsers)
        .set({ banned: true, updatedAt: new Date() })
        .where(eq(publicUsers.id, targetId));
    } catch (e) {
      this.logger.error(
        { action: 'ban', targetId, adminId, reason: 'update-fail', err: this.safeErr(e) },
        'banUser update thất bại',
      );
      throw new InternalServerErrorException('Khóa tài khoản thất bại');
    }

    // AC8: log chỉ targetId + adminId (KHÔNG log email/phone raw).
    this.logger.log(
      { action: 'ban', targetId, adminId, reason: 'success' },
      'Admin ban user',
    );
    await this.insertAudit(adminId, targetId, 'ban');

    return this.toItem(target, true);
  }

  // AC3: POST /admin/users/:id/unban — set banned=false.
  async unbanUser(targetId: string, adminId: string): Promise<AdminUserItem> {
    const target = await this.findUserOrThrow(targetId);

    // E7: idempotent — banned already false → vẫn 200 (no-op update).
    // Unban KHÔNG check role (admin có thể bị ban qua SQL direct → unban OK).
    try {
      await this.db
        .update(publicUsers)
        .set({ banned: false, updatedAt: new Date() })
        .where(eq(publicUsers.id, targetId));
    } catch (e) {
      this.logger.error(
        { action: 'unban', targetId, adminId, reason: 'update-fail', err: this.safeErr(e) },
        'unbanUser update thất bại',
      );
      throw new InternalServerErrorException('Mở khóa tài khoản thất bại');
    }

    this.logger.log(
      { action: 'unban', targetId, adminId, reason: 'success' },
      'Admin unban user',
    );
    await this.insertAudit(adminId, targetId, 'unban');

    return this.toItem(target, false);
  }

  // AC1: POST /admin/users/:id/role — grant/revoke admin role.
  // AC3/E4: self-revoke (targetId === adminId AND newRole === 'user') → 400
  //   (R1 — prevent admin lockout). Self-grant (newRole === 'admin' cho chính
  //   mình) → idempotent 200 (đã là admin — E5, KHÔNG block).
  // AC4/E5: idempotent — role already === newRole → vẫn 200 (no-op update).
  // AC6: log chỉ targetId + adminId + newRole (KHÔNG log email/phone raw).
  async grantRole(
    targetId: string,
    newRole: 'admin' | 'user',
    adminId: string,
  ): Promise<AdminUserItem> {
    // E4: self-revoke → 400 (R1 — prevent admin lockout).
    if (targetId === adminId && newRole === 'user') {
      this.logger.warn(
        { action: 'role-grant', targetId, adminId, newRole, reason: 'self-revoke' },
        'Admin tự thu hồi role mình — từ chối',
      );
      throw new BadRequestException('Không thể thu hồi vai trò của chính mình');
    }

    const target = await this.findUserOrThrow(targetId);

    // Defense-in-depth: super-admin role KHÔNG thay đổi qua API (chỉ SQL/migration).
    // roleGrantSchema chỉ chấp nhận 'admin'|'user' — nếu target đang là super-admin,
    // reject 400 để tránh demote super-admin (R2 — prevent privilege loss).
    if (target.role === 'super-admin') {
      this.logger.warn(
        { action: 'role-grant', targetId, adminId, newRole, reason: 'super-admin-target' },
        'Cố gắng thay đổi role super-admin qua API — từ chối',
      );
      throw new BadRequestException(
        'Không thể thay đổi vai trò super-admin qua API',
      );
    }

    // E5: idempotent — role already === newRole → vẫn 200 (no-op update).
    try {
      await this.db
        .update(publicUsers)
        .set({ role: newRole, updatedAt: new Date() })
        .where(eq(publicUsers.id, targetId));
    } catch (e) {
      this.logger.error(
        { action: 'role-grant', targetId, adminId, newRole, reason: 'update-fail', err: this.safeErr(e) },
        'grantRole update thất bại',
      );
      throw new InternalServerErrorException('Cập nhật vai trò thất bại');
    }

    // AC6: log chỉ targetId + adminId + newRole (KHÔNG log email/phone raw).
    this.logger.log(
      { action: 'role-grant', targetId, adminId, newRole, reason: 'success' },
      'Admin role grant',
    );
    await this.insertAudit(adminId, targetId, newRole === 'admin' ? 'role_grant' : 'role_revoke', newRole);

    // Trả newRole (sau update) — toItem roleOverride tránh stale row.role.
    return this.toItem(target, target.banned, newRole);
  }

  // Story 2.4 + 2.5: persistent audit log cho user actions.
  private async insertAudit(adminId: string, targetId: string, action: string, detail?: string): Promise<void> {
    try {
      await this.db.insert(userAuditLogs).values({ adminId, targetId, action, detail: detail ?? null });
    } catch (e) {
      // Non-blocking — log but don't fail the action.
      this.logger.warn(
        { action: 'audit-insert', reason: 'db-fail', err: e instanceof Error ? e.message : String(e) },
        'Audit log insert failed (non-blocking)',
      );
    }
  }

  // Query target user → 404 if not exist (E6).
  private async findUserOrThrow(targetId: string) {
    let row: typeof publicUsers.$inferSelect | undefined;
    try {
      const rows = await this.db
        .select()
        .from(publicUsers)
        .where(eq(publicUsers.id, targetId));
      row = rows[0];
    } catch (e) {
      this.logger.error(
        { action: 'find-user', targetId, reason: 'db-fail', err: this.safeErr(e) },
        'findUserOrThrow DB query thất bại',
      );
      throw new InternalServerErrorException('Lỗi truy vấn người dùng');
    }
    if (!row) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return row;
  }

  private toItem(
    row: typeof publicUsers.$inferSelect,
    banned: boolean,
    roleOverride?: string,
  ): AdminUserItem {
    return {
      id: row.id,
      email: row.email,
      phone: row.phone,
      role: roleOverride ?? row.role,
      banned,
      createdAt: row.createdAt,
    };
  }

  private safeErr(e: unknown): { name: string; message: string } {
    if (e instanceof Error) return { name: e.name, message: e.message };
    return { name: 'Unknown', message: String(e) };
  }
}
