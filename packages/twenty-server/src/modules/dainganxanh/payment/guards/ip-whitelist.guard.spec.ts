import { Test, type TestingModule } from '@nestjs/testing';
import { CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

import { IpWhitelistGuard } from './ip-whitelist.guard';

describe('IpWhitelistGuard', () => {
    let guard: IpWhitelistGuard;

    const mockExecutionContext = (ip: string, headers: Record<string, string> = {}): ExecutionContext => ({
        switchToHttp: () => ({
            getRequest: () => ({
                headers,
                connection: { remoteAddress: ip },
                socket: { remoteAddress: ip },
                ip,
            }),
        }),
    } as ExecutionContext);

    describe('when ENABLE_IP_WHITELIST is false', () => {
        beforeEach(() => {
            delete process.env.ENABLE_IP_WHITELIST;
            guard = new IpWhitelistGuard();
        });

        it('should allow all IPs', () => {
            expect(guard.canActivate(mockExecutionContext('192.168.1.100'))).toBe(true);
        });
    });

    describe('when ENABLE_IP_WHITELIST is true', () => {
        beforeEach(() => {
            process.env.ENABLE_IP_WHITELIST = 'true';
            process.env.BANKING_WEBHOOK_ALLOWED_IPS = '10.0.0.1,10.0.0.2';
            guard = new IpWhitelistGuard();
        });

        afterEach(() => {
            delete process.env.ENABLE_IP_WHITELIST;
            delete process.env.BANKING_WEBHOOK_ALLOWED_IPS;
        });

        it('should allow whitelisted IPs', () => {
            expect(guard.canActivate(mockExecutionContext('10.0.0.1'))).toBe(true);
            expect(guard.canActivate(mockExecutionContext('10.0.0.2'))).toBe(true);
        });

        it('should block non-whitelisted IPs', () => {
            expect(() => guard.canActivate(mockExecutionContext('192.168.1.1'))).toThrow(ForbiddenException);
        });

        it('should handle X-Forwarded-For header', () => {
            const context = mockExecutionContext('192.168.1.1', { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' });
            expect(guard.canActivate(context)).toBe(true);
        });

        it('should handle X-Real-IP header', () => {
            const context = mockExecutionContext('192.168.1.1', { 'x-real-ip': '10.0.0.2' });
            expect(guard.canActivate(context)).toBe(true);
        });
    });

    describe('localhost in development', () => {
        beforeEach(() => {
            process.env.ENABLE_IP_WHITELIST = 'true';
            process.env.BANKING_WEBHOOK_ALLOWED_IPS = '10.0.0.1';
            process.env.NODE_ENV = 'development';
            guard = new IpWhitelistGuard();
        });

        afterEach(() => {
            delete process.env.NODE_ENV;
            delete process.env.ENABLE_IP_WHITELIST;
            delete process.env.BANKING_WEBHOOK_ALLOWED_IPS;
        });

        it('should allow localhost in development', () => {
            expect(guard.canActivate(mockExecutionContext('127.0.0.1'))).toBe(true);
            expect(guard.canActivate(mockExecutionContext('::1'))).toBe(true);
        });
    });
});
