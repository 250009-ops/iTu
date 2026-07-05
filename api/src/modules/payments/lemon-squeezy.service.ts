import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
export class LemonSqueezyService {
  private readonly logger = new Logger(LemonSqueezyService.name);

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('LEMON_SQUEEZY_API_KEY')?.trim() &&
        this.config.get<string>('LEMON_SQUEEZY_STORE_ID')?.trim(),
    );
  }

  resolveVariantId(packageSlug: string): string | null {
    const raw = this.config.get<string>('LEMON_SQUEEZY_VARIANTS', '{}');
    try {
      const map = JSON.parse(raw) as Record<string, string>;
      return map[packageSlug]?.trim().replace(/\s+/g, '') || null;
    } catch {
      this.logger.warn('LEMON_SQUEEZY_VARIANTS is not valid JSON');
      return null;
    }
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const apiKey = this.config.get<string>('LEMON_SQUEEZY_API_KEY')?.trim();
    const storeId = this.config.get<string>('LEMON_SQUEEZY_STORE_ID')?.trim();
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000').replace(/\/$/, '');

    if (!apiKey || !storeId) {
      throw new Error('Lemon Squeezy is not configured');
    }

    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_options: { embed: false },
            checkout_data: {
              email: input.email,
              name: input.name,
              custom: {
                order_id: input.orderId,
                order_code: input.orderCode,
              },
            },
            product_options: {
              name: input.packageTitle,
              redirect_url: `${appUrl}/student/mock-day?payment=success&order=${encodeURIComponent(input.orderCode)}`,
              receipt_button_text: 'Go to Mock Day',
            },
          },
          relationships: {
            store: {
              data: { type: 'stores', id: storeId },
            },
            variant: {
              data: { type: 'variants', id: input.variantId },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Lemon checkout failed (${response.status}): ${body}`);
      throw new Error('Could not create payment checkout');
    }

    const payload = (await response.json()) as {
      data: {
        id: string;
        attributes: { url: string };
      };
    };

    return {
      checkoutId: payload.data.id,
      checkoutUrl: payload.data.attributes.url,
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
