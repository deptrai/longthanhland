import { Injectable, CanActivate, ExecutionContext, Logger, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * IP Whitelist Guard for Banking Webhook
 * 
 * Restricts access to webhook endpoints to only allowed IP addresses.
 * Configure via environment variable: BANKING_WEBHOOK_ALLOWED_IPS
 * 
 * Usage:
 * @UseGuards(IpWhitelistGuard)
 * @Controller('webhooks/banking')
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
    private readonly logger = new Logger(IpWhitelistGuard.name);
    private readonly allowedIps: Set<string>;
    private readonly isEnabled: boolean;

    constructor() {
        const ipsConfig = process.env.BANKING_WEBHOOK_ALLOWED_IPS || '';
        this.allowedIps = new Set(
            ipsConfig.split(',').map(ip => ip.trim()).filter(Boolean)
        );
        this.isEnabled = process.env.ENABLE_IP_WHITELIST === 'true';

        if (this.isEnabled && this.allowedIps.size > 0) {
            this.logger.log(`IP whitelist enabled with ${this.allowedIps.size} IPs`);
        } else {
            this.logger.warn('IP whitelist DISABLED - all IPs allowed');
        }
    }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        // Skip if disabled
        if (!this.isEnabled) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const clientIp = this.getClientIp(request);

        // Allow localhost in development
        if (process.env.NODE_ENV === 'development') {
            const localhostIps = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
            if (localhostIps.includes(clientIp)) {
                return true;
            }
        }

        // Check if IP is in whitelist
        if (this.allowedIps.has(clientIp)) {
            this.logger.log(`[IP_WHITELIST] Allowed IP: ${clientIp}`);
            return true;
        }

        // Log and reject
        this.logger.warn(`[IP_WHITELIST] Blocked IP: ${clientIp}`);
        throw new ForbiddenException(`IP ${clientIp} not allowed`);
    }

    private getClientIp(request: any): string {
        // Check X-Forwarded-For header (common with proxies/load balancers)
        const forwardedFor = request.headers['x-forwarded-for'];
        if (forwardedFor) {
            // Take the first IP if multiple
            return forwardedFor.split(',')[0].trim();
        }

        // Check X-Real-IP header
        const realIp = request.headers['x-real-ip'];
        if (realIp) {
            return realIp.trim();
        }

        // Fallback to socket remote address
        return request.connection?.remoteAddress
            || request.socket?.remoteAddress
            || request.ip
            || 'unknown';
    }
}
