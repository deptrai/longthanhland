import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import type { CrossPostPlatform, IPromotionProvider } from './providers/promotion-provider.interface';
import { StubProvider } from './providers/stub.provider';
import { FacebookProvider } from './providers/facebook.provider';
import { ChoTotProvider } from './providers/cho-tot.provider';
import { ZaloProvider } from './providers/zalo.provider';

/**
 * ProviderRegistry (AC8) — Story 5.1 / 5.2 / 5.3 / 5.4.
 *
 * Config-based provider enable/disable (AD-3).
 * Đọc XACTION_ENABLED_PROVIDERS (comma-separated, VD "facebook,cho_tot").
 * Provider disabled = KHÔNG instantiate (tiết kiệm resource).
 *
 * Story 5.2: facebook → FacebookProvider (gọi XActions REST API thật).
 * Story 5.3: cho_tot → ChoTotProvider (assisted posting MVP).
 * Story 5.4: zalo → ZaloProvider (assisted posting MVP).
 * StubProvider giữ lại cho test purposes (không dùng cho platform thật).
 *
 * E5: facebook enabled NHƯNG XACTIONS_API_TOKEN empty → log error + KHÔNG
 * register facebook (graceful — getProvider('facebook') sẽ throw "chưa bật").
 */
@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistry.name);
  private enabledPlatforms: Set<CrossPostPlatform> = new Set();
  private providers: Map<CrossPostPlatform, IPromotionProvider> = new Map();

  // All valid platform names (for validation).
  private readonly allPlatforms: CrossPostPlatform[] = ['facebook', 'cho_tot', 'zalo'];

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly stubProvider: StubProvider,
    private readonly facebookProvider: FacebookProvider,
    private readonly choTotProvider: ChoTotProvider,
    private readonly zaloProvider: ZaloProvider,
  ) {}

  onModuleInit(): void {
    const raw = this.config.get('XACTION_ENABLED_PROVIDERS', { infer: true }) ?? '';
    this.enabledPlatforms = this.parseProviders(raw);
    this.logger.log(
      { action: 'provider-registry-init', enabled: [...this.enabledPlatforms] },
      'ProviderRegistry initialized',
    );

    // Story 5.2: facebook → FacebookProvider (nếu token configured).
    // cho_tot/zalo → StubProvider (story 5.3/5.4 thay).
    const token = this.config.get('XACTIONS_API_TOKEN', { infer: true }) ?? '';

    for (const platform of this.enabledPlatforms) {
      if (platform === 'facebook') {
        // E5: token empty → graceful skip (KHÔNG register, log error).
        if (!token || token.trim().length === 0) {
          this.logger.error(
            { action: 'provider-registry-init', platform: 'facebook', reason: 'token-missing' },
            'XACTIONS_API_TOKEN missing — facebook provider disabled (set XACTIONS_API_TOKEN to enable)',
          );
          continue;
        }
        this.providers.set('facebook', this.facebookProvider);
      } else if (platform === 'cho_tot') {
        // Story 5.3: cho_tot → ChoTotProvider (assisted posting, no token needed).
        this.providers.set('cho_tot', this.choTotProvider);
      } else if (platform === 'zalo') {
        // Story 5.4: zalo → ZaloProvider (assisted posting, no token needed).
        this.providers.set('zalo', this.zaloProvider);
      } else {
        // Fallback (should not reach — all 3 platforms have real providers now).
        this.providers.set(platform, this.stubProvider);
      }
    }
  }

  /**
   * Parse XACTION_ENABLED_PROVIDERS (comma-separated) → Set<CrossPostPlatform>.
   * Invalid/unknown platform names → log warn + skip (graceful).
   */
  private parseProviders(raw: string): Set<CrossPostPlatform> {
    const result = new Set<CrossPostPlatform>();
    if (!raw || !raw.trim()) return result;
    for (const part of raw.split(',')) {
      const trimmed = part.trim().toLowerCase();
      if (!trimmed) continue;
      if (!this.allPlatforms.includes(trimmed as CrossPostPlatform)) {
        this.logger.warn(
          { action: 'provider-registry-parse', platform: trimmed, reason: 'unknown' },
          `Unknown platform "${trimmed}" in XACTION_ENABLED_PROVIDERS — skipping`,
        );
        continue;
      }
      result.add(trimmed as CrossPostPlatform);
    }
    return result;
  }

  /**
   * getProvider(platform) — return provider cho platform.
   * Throw BadRequestException nếu platform không enabled (E5).
   */
  getProvider(platform: CrossPostPlatform): IPromotionProvider {
    const provider = this.providers.get(platform);
    if (!provider) {
      throw new BadRequestException(
        `Nền tảng ${platform} chưa được bật — kiểm tra XACTION_ENABLED_PROVIDERS`,
      );
    }
    return provider;
  }

  /**
   * getEnabledPlatforms() — list platform đang enabled (cho FE hiển thị option).
   */
  getEnabledPlatforms(): CrossPostPlatform[] {
    return [...this.enabledPlatforms];
  }

  /**
   * isEnabled(platform) — check platform có enabled không.
   */
  isEnabled(platform: CrossPostPlatform): boolean {
    return this.enabledPlatforms.has(platform);
  }
}
