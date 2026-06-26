import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle, type DrizzleDB } from '../../db/database.tokens';
import { publicUsers } from '../../db/schema/public-users';
import type { Request } from 'express';
import type { JwtUser } from '../../auth/guards/jwt-auth.guard';

// AdminGuard (AC4, AC5, AD-5) — Story 2.4.
//
// Query public_users.role từ DB — KHÔNG trust JWT role claim (JWT stale risk:
// user bị demote sau khi JWT issued, JWT valid 1h). JwtAuthGuard chạy trước
// (verify JWT + attach req.user.id), AdminGuard chạy sau (query DB check role).
//
// E2/E3: role='user' → 403. Orphan (no public_users row) → 403 (KHÔNG 404 —
// KHÔNG leak existence). DB query fail → 500 generic (AD-7).
//
// Trade-off: 1 SELECT / admin request. Admin traffic low → acceptable.
// Future: cache role trong Redis (TTL 60s) nếu cần.
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user: JwtUser }).user;
    if (!user?.id) {
      // JwtAuthGuard chưa pass — shouldn't reach here if guard order correct.
      throw new ForbiddenException('Không có quyền truy cập');
    }

    let role: string | undefined;
    try {
      const rows = await this.db
        .select({ role: publicUsers.role })
        .from(publicUsers)
        .where(eq(publicUsers.id, user.id));
      role = rows[0]?.role;
    } catch (e) {
      this.logger.error(
        { userId: user.id, action: 'admin-guard', reason: 'db-fail', err: this.safeErr(e) },
        'AdminGuard DB query thất bại',
      );
      throw new InternalServerErrorException('Lỗi xác thực quyền');
    }

    if (!role || role !== 'admin') {
      // E2/E3: not admin → 403. Orphan → 403 (KHÔNG 404 — không leak existence).
      this.logger.warn(
        { userId: user.id, action: 'admin-guard', reason: role ? 'not-admin' : 'orphan' },
        'Từ chối truy cập admin',
      );
      throw new ForbiddenException('Không có quyền truy cập');
    }

    return true;
  }

  private safeErr(e: unknown): { name: string; message: string } {
    if (e instanceof Error) return { name: e.name, message: e.message };
    return { name: 'Unknown', message: String(e) };
  }
}
