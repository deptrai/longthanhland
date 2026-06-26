import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtUser } from '../../auth/guards/jwt-auth.guard';

// SuperAdminGuard — Story 2.5.
// Chỉ super-admin mới được grant/revoke admin role.
// AdminGuard phải chạy trước (attach req.user.role).
@Injectable()
export class SuperAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user: JwtUser & { role?: string } }).user;
    if (user?.role !== 'super-admin') {
      throw new ForbiddenException('Chỉ super-admin mới được thực hiện hành động này');
    }
    return true;
  }
}
