/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderRegistry } from './provider-registry';
import { StubProvider } from './providers/stub.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { ChoTotProvider } from './providers/cho-tot.provider';
import { ZaloProvider } from './providers/zalo.provider';

// Minimal mock FacebookProvider — chỉ cần instance cho DI (không gọi thật).
function createMockFacebookProvider(): any {
  return {
    platform: 'facebook',
    postListing: jest.fn(),
    removePost: jest.fn(),
    getPostStatus: jest.fn(),
  };
}

function createMockChoTotProvider(): any {
  return {
    platform: 'cho_tot',
    postListing: jest.fn(),
    removePost: jest.fn(),
    getPostStatus: jest.fn(),
  };
}

function createMockZaloProvider(): any {
  return {
    platform: 'zalo',
    postListing: jest.fn(),
    removePost: jest.fn(),
    getPostStatus: jest.fn(),
  };
}

describe('ProviderRegistry (AC8, E5) — Story 5.1/5.2', () => {
  // configMap: key → value. Token default set cho facebook-enabled tests.
  function createRegistry(
    configValue: string,
    overrides: Record<string, string> = {},
  ): ProviderRegistry {
    const defaults: Record<string, string> = {
      XACTION_ENABLED_PROVIDERS: configValue,
      XACTIONS_API_TOKEN: 'test-token',
      XACTIONS_FB_ACCOUNT_ID: 'fb-account-1',
      ...overrides,
    };
    const config: any = {
      get: jest.fn((key: string) => defaults[key]),
    };
    const stub = new StubProvider();
    const fb = createMockFacebookProvider();
    const choTot = createMockChoTotProvider();
    const zalo = createMockZaloProvider();
    const registry = new ProviderRegistry(
      config as ConfigService<any, true>,
      stub,
      fb as unknown as FacebookProvider,
      choTot as unknown as ChoTotProvider,
      zalo as unknown as ZaloProvider,
    );
    registry.onModuleInit();
    return registry;
  }

  it('facebook enabled + token set → getProvider("facebook") returns FacebookProvider', () => {
    const registry = createRegistry('facebook');
    const provider = registry.getProvider('facebook');
    expect(provider).toBeDefined();
    expect(provider.platform).toBe('facebook');
  });

  // E5: facebook enabled NHƯNG token empty → graceful skip (KHÔNG register).
  it('E5: facebook enabled + token empty → getProvider("facebook") throws', () => {
    const registry = createRegistry('facebook', { XACTIONS_API_TOKEN: '' });
    expect(() => registry.getProvider('facebook')).toThrow(BadRequestException);
  });

  it('XACTION_ENABLED_PROVIDERS=facebook → getProvider("zalo") throws BadRequest', () => {
    const registry = createRegistry('facebook');
    expect(() => registry.getProvider('zalo')).toThrow(BadRequestException);
  });

  it('empty config → getProvider throws for any platform', () => {
    const registry = createRegistry('');
    expect(() => registry.getProvider('facebook')).toThrow(BadRequestException);
    expect(() => registry.getProvider('cho_tot')).toThrow(BadRequestException);
    expect(() => registry.getProvider('zalo')).toThrow(BadRequestException);
  });

  it('getEnabledPlatforms() returns parsed list', () => {
    const registry = createRegistry('facebook,cho_tot');
    const enabled = registry.getEnabledPlatforms();
    expect(enabled).toHaveLength(2);
    expect(enabled).toContain('facebook');
    expect(enabled).toContain('cho_tot');
  });

  it('multiple platforms comma-separated → all enabled', () => {
    const registry = createRegistry('facebook,cho_tot,zalo');
    expect(registry.getEnabledPlatforms()).toHaveLength(3);
    expect(registry.isEnabled('facebook')).toBe(true);
    expect(registry.isEnabled('cho_tot')).toBe(true);
    expect(registry.isEnabled('zalo')).toBe(true);
  });

  it('unknown platform in config → skipped (graceful)', () => {
    const registry = createRegistry('facebook,unknown_platform,zalo');
    expect(registry.getEnabledPlatforms()).toHaveLength(2);
    expect(() => registry.getProvider('facebook')).not.toThrow();
    expect(() => registry.getProvider('zalo')).not.toThrow();
  });

  it('config with whitespace + mixed case → trimmed + lowercased', () => {
    const registry = createRegistry(' Facebook , CHO_TOT ');
    expect(registry.getEnabledPlatforms()).toEqual(['facebook', 'cho_tot']);
  });

  it('isEnabled returns false for disabled platform', () => {
    const registry = createRegistry('facebook');
    expect(registry.isEnabled('facebook')).toBe(true);
    expect(registry.isEnabled('zalo')).toBe(false);
  });

  // Story 5.3: cho_tot → ChoTotProvider (assisted posting).
  it('cho_tot enabled → getProvider returns ChoTotProvider', () => {
    const registry = createRegistry('cho_tot');
    const provider = registry.getProvider('cho_tot');
    expect(provider).toBeDefined();
    expect(provider.platform).toBe('cho_tot');
  });

  // Story 5.4: zalo → ZaloProvider (assisted posting).
  it('zalo enabled → getProvider returns ZaloProvider', () => {
    const registry = createRegistry('zalo');
    const provider = registry.getProvider('zalo');
    expect(provider).toBeDefined();
    expect(provider.platform).toBe('zalo');
  });
});

describe('ProviderRegistry — NestJS DI integration', () => {
  it('can be compiled via Test.createTestingModule', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderRegistry,
        StubProvider,
        { provide: FacebookProvider, useValue: createMockFacebookProvider() },
        { provide: ChoTotProvider, useValue: createMockChoTotProvider() },
        { provide: ZaloProvider, useValue: createMockZaloProvider() },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'XACTION_ENABLED_PROVIDERS') return 'facebook';
              if (key === 'XACTIONS_API_TOKEN') return 'test-token';
              if (key === 'XACTIONS_FB_ACCOUNT_ID') return 'fb-1';
              return undefined;
            }),
          },
        },
      ],
    }).compile();
    const registry = module.get(ProviderRegistry);
    // onModuleInit is called by NestJS on app.init(), not on compile().
    registry.onModuleInit();
    expect(registry.getEnabledPlatforms()).toEqual(['facebook']);
  });
});
