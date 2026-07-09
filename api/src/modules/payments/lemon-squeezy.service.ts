import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import { LEMON_VARIANTS } from '../../config/lemon-variants';

type CheckoutInput = {
  orderId: string;
  orderCode: string;
  email: string;
  name: string;
  amount: number;
  currency: string;
  packageTitle: string;
  variantId: string;
};

type CheckoutResult = {
  checkoutId: string;
  checkoutUrl: string;
};

@Injectable()
export class LemonSqueezyService implements OnModuleInit {
  private readonly logger = new Logger(LemonSqueezyService.name);
  private variantMap: Record<string, string> = {};
  private storeSlug = '';
  private variantSlugById: Record<string, string> = {};

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    this.variantMap = this.loadVariantMap();
    const keys = Object.keys(this.variantMap);
    this.logger.log(
      `Lemon variants loaded: ${keys.length} package(s) [${keys.join(', ')}]`,
    );
    await this.loadStoreAndVariantSlugs();
  }

  private loadVariantMap(): Record<string, string> {
    const normalized: Record<string, string> = { ...LEMON_VARIANTS };

    const raw = this.config.get<string>('LEMON_SQUEEZY_VARIANTS', '').trim();
    if (raw && raw !== '{}') {
      try {
        const fromEnv = JSON.parse(raw) as Record<string, string>;
        for (const [key, value] of Object.entries(fromEnv)) {
          if (value?.trim()) normalized[key.trim()] = value.trim().replace(/\s+/g, '');
        }
      } catch {
        this.logger.warn('LEMON_SQUEEZY_VARIANTS env JSON invalid — using file map only');
      }
    }

    const overridePath = this.config.get<string>('LEMON_VARIANTS_FILE', '').trim();
    if (overridePath && existsSync(overridePath)) {
      try {
        const fromPath = JSON.parse(readFileSync(overridePath, 'utf8')) as Record<
          string,
          string
        >;
        for (const [key, value] of Object.entries(fromPath)) {
          if (value?.trim()) normalized[key.trim()] = value.trim();
        }
      } catch {
        this.logger.warn(`Could not parse LEMON_VARIANTS_FILE at ${overridePath}`);
      }
    }

    return normalized;
  }

  private async lemonFetch(path: string) {
    const apiKey = this.config.get<string>('LEMON_SQUEEZY_API_KEY')?.trim();
    if (!apiKey) throw new Error('Lemon API key missing');

    const response = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Lemon API ${path} failed (${response.status}): ${body.slice(0, 200)}`);
    }
    return response.json() as Promise<{
      data: { id: string; attributes: Record<string, string> };
    }>;
  }

  private async loadStoreAndVariantSlugs() {
    if (!this.isConfigured()) return;

    try {
      const storeId = this.config.get<string>('LEMON_SQUEEZY_STORE_ID')?.trim();
      const store = await this.lemonFetch(`/stores/${storeId}`);
      this.storeSlug = store.data.attributes.slug?.trim() ?? '';
      this.logger.log(`Lemon store slug: ${this.storeSlug} (${storeId})`);

      const ids = [...new Set(Object.values(this.variantMap).map((id) => id.trim()))];
      for (const id of ids) {
        const variant = await this.lemonFetch(`/variants/${id}`);
        const slug = variant.data.attributes.slug?.trim();
        if (slug) this.variantSlugById[id] = slug;
      }
      this.logger.log(`Lemon variant slugs loaded: ${Object.keys(this.variantSlugById).length}`);
    } catch (err) {
      this.logger.error(
        `Could not preload Lemon checkout slugs: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('LEMON_SQUEEZY_API_KEY')?.trim() &&
        this.config.get<string>('LEMON_SQUEEZY_STORE_ID')?.trim(),
    );
  }

  resolveVariantId(packageSlug: string, packageKind?: string): string | null {
    const slug = packageSlug.trim();
    const direct =
      this.variantMap[slug] ??
      this.variantMap[slug.replace(/-\d+$/, '')] ??
      (packageKind ? this.variantMap[packageKind] : undefined);
    return direct?.trim() || null;
  }

  /**
   * Lemon's /checkouts API currently redirects to a broken cart URL for this account.
   * Use hosted buy links with checkout[custom] query params (webhook-safe).
   */
  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const variantSlug = this.variantSlugById[input.variantId.trim()];
    if (!this.storeSlug || !variantSlug) {
      throw new Error('Lemon checkout is not ready — store or variant slug missing');
    }

    const params = new URLSearchParams();
    params.set('checkout[email]', input.email);
    params.set('checkout[name]', input.name);
    params.set('checkout[custom][order_id]', input.orderId);
    params.set('checkout[custom][order_code]', input.orderCode);
    // Redirect URL: set per product in Lemon dashboard (Confirmation modal → Button link).

    const checkoutUrl = `https://${this.storeSlug}.lemonsqueezy.com/checkout/buy/${variantSlug}?${params.toString()}`;

    return {
      checkoutId: `buy:${input.variantId}`,
      checkoutUrl,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>('LEMON_SQUEEZY_WEBHOOK_SECRET')?.trim();
    if (!secret || !signature) return false;

    const crypto = require('crypto') as typeof import('crypto');
    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (digest.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }
}
