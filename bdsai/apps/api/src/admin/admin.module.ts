import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// AdminModule (AD-1 Module Isolation, AC10) — Story 2.4.
//
// Admin business domain riêng (KHÔNG trong auth/). AdminController +
// AdminService + AdminGuard.
//
// AC10: rate limit 20 admin actions / 15 phút / IP qua @Throttle trên
// AdminController. ThrottlerGuard toàn cục đã được AuthModule đăng ký qua
// APP_GUARD (Story 2.2) — áp dụng cho mọi controller. @Throttle trên
// AdminController override default cho admin routes (20/15min). KHÔNG đăng ký
// ThrottlerModule/APP_GUARD thứ hai trong AdminModule — tránh DI conflict
// (hai provider cùng token ThrottlerStorage).
//
// JwtAuthGuard + AdminGuard provided trong AdminModule để @UseGuards instantiate
// qua DI. Dependencies (ConfigService, SupabaseService, DRIZZLE) đều @Global.
@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, SuperAdminGuard, JwtAuthGuard],
})
export class AdminModule {}
