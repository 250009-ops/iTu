import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { Agent, request as httpsRequest } from 'https';

export type CheckoutInput = {
  orderId: string;
  orderCode: string;
  email: string;
  name: string;
  amount: number;
  currency: string;
  packageTitle: string;
  clientId: string;
  successPath?: string;
  failurePath?: string;
  sessionTimeoutSecs?: number;
};

export type CheckoutResult = {
  checkoutId: string;
  checkoutUrl: string;
};

export type UzumCallbackPayload = {
  orderId: string;
  operationState: 'SUCCESS' | 'FAIL';
  operationType:
    | 'AUTHORIZE'
    | 'COMPLETE'
    | 'REFUND'
    | 'REVERSE'
    | 'TOP_UP_COMPLETED';
  orderNumber: string;
  merchantOperationId?: string;
  rrn?: string;
  bindingId?: string;
};

type UzumApiResponse<T> = {
  errorCode: number;
  message?: string;
  result?: T;
};

type PaymentRegisterResult = {
  orderId: string;
  paymentRedirectUrl: string;
};

export type UzumOrderStatusResult = {
  orderId: string;
  status: string;
  merchantOrderId: string;
  amount: number;
};

const UZS_CURRENCY_CODE = 860;
const DEFAULT_BASE_URL = 'https://test-chk-api.uzumcheckout.uz';
const PAID_STATUSES = new Set(['COMPLETED', 'TOP_UP_COMPLETED']);

@Injectable()
export class UzumCheckoutService {
  private readonly logger = new Logger(UzumCheckoutService.name);
  private httpsAgent: Agent | undefined;
  private signatureCache = '';

  constructor(private config: ConfigService) {}

  isConfigured(): boolean {
    const terminalId = this.config.get<string>('UZUM_CHECKOUT_TERMINAL_ID')?.trim();
    if (!terminalId) return false;

    const apiKey = this.config.get<string>('UZUM_CHECKOUT_API_KEY')?.trim();
    const certPath = this.config.get<string>('UZUM_CHECKOUT_CERT_PATH')?.trim();
    const keyPath = this.config.get<string>('UZUM_CHECKOUT_KEY_PATH')?.trim();

    return Boolean(apiKey || (certPath && keyPath && existsSync(certPath) && existsSync(keyPath)));
  }

  /** Whole som → tiyin (Uzum wire format). */
  amountToTiyin(amountSom: number): number {
    return Math.round(amountSom * 100);
  }

  isPaidStatus(status: string | undefined): boolean {
    return Boolean(status && PAID_STATUSES.has(status.toUpperCase()));
  }

  isSuccessfulPaymentCallback(payload: UzumCallbackPayload): boolean {
    if (payload.operationState !== 'SUCCESS') return false;
    return payload.operationType === 'COMPLETE' || payload.operationType === 'TOP_UP_COMPLETED';
  }

  isSuccessfulRefundCallback(payload: UzumCallbackPayload): boolean {
    return payload.operationState === 'SUCCESS' && payload.operationType === 'REFUND';
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const appUrl = this.appUrl();
    const successPath = input.successPath ?? '/student/mock-day?payment=success';
    const failurePath = input.failurePath ?? '/student/browse?payment=failed';
    const sessionTimeoutSecs = this.clampSessionTimeout(input.sessionTimeoutSecs ?? 900);
    const amountTiyin = this.amountToTiyin(input.amount);
    const title = `${input.packageTitle} — ${input.orderCode}`.slice(0, 63);

    const body = {
      amount: amountTiyin,
      clientId: input.clientId,
      currency: UZS_CURRENCY_CODE,
      paymentDetails: `${input.packageTitle} — ${input.orderCode}`.slice(0, 1024),
      orderNumber: input.orderCode,
      successUrl: `${appUrl}${successPath}${successPath.includes('?') ? '&' : '?'}order=${encodeURIComponent(input.orderCode)}`,
      failureUrl: `${appUrl}${failurePath}${failurePath.includes('?') ? '&' : '?'}order=${encodeURIComponent(input.orderCode)}`,
      viewType: 'REDIRECT',
      sessionTimeoutSecs,
      paymentParams: {
        payType: 'ONE_STEP',
      },
      merchantParams: {
        cart: this.buildFiscalCart({
          cartId: input.orderCode,
          title,
          productId: input.orderId,
          amountTiyin,
        }),
      },
    };

    const response = await this.request<PaymentRegisterResult>(
      '/api/v1/payment/register',
      body,
    );

    if (!response.result?.orderId || !response.result.paymentRedirectUrl) {
      throw new Error('Uzum checkout registration returned no redirect URL');
    }

    return {
      checkoutId: response.result.orderId,
      checkoutUrl: response.result.paymentRedirectUrl,
    };
  }

  async getOrderStatus(uzumOrderId: string): Promise<UzumOrderStatusResult | null> {
    try {
      const response = await this.request<UzumOrderStatusResult>(
        '/api/v1/payment/getOrderStatus',
        { orderId: uzumOrderId },
      );
      return response.result ?? null;
    } catch (err) {
      this.logger.warn(
        `Uzum getOrderStatus failed for ${uzumOrderId}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private clampSessionTimeout(seconds: number): number {
    return Math.min(1800, Math.max(600, Math.round(seconds)));
  }

  private appUrl(): string {
    return this.config.get<string>('APP_URL', 'http://localhost:3000').replace(/\/$/, '');
  }

  private baseUrl(): string {
    return (
      this.config.get<string>('UZUM_CHECKOUT_BASE_URL', DEFAULT_BASE_URL).trim() ||
      DEFAULT_BASE_URL
    ).replace(/\/$/, '');
  }

  private terminalId(): string {
    const terminalId = this.config.get<string>('UZUM_CHECKOUT_TERMINAL_ID')?.trim();
    if (!terminalId) throw new Error('UZUM_CHECKOUT_TERMINAL_ID is not configured');
    return terminalId;
  }

  private contentLanguage(): string {
    return this.config.get<string>('UZUM_CHECKOUT_CONTENT_LANGUAGE', 'uz-UZ').trim() || 'uz-UZ';
  }

  /** OFD cart for Uzum auto-fiscalization (required on this terminal). */
  private buildFiscalCart(input: {
    cartId: string;
    title: string;
    productId: string;
    amountTiyin: number;
  }) {
    const spic =
      this.config.get<string>('UZUM_CHECKOUT_IKPU_SPIC', '10899001001000000').trim() ||
      '10899001001000000';
    const packageCode =
      this.config.get<string>('UZUM_CHECKOUT_PACKAGE_CODE', '190309').trim() || '190309';
    const vatPercent = Number(this.config.get<string>('UZUM_CHECKOUT_VAT_PERCENT', '0')) || 0;
    const tin = this.config.get<string>('UZUM_CHECKOUT_MERCHANT_TIN', '').trim();
    const pinfl = this.config.get<string>('UZUM_CHECKOUT_MERCHANT_PINFL', '').trim();
    const receiptParams: Record<string, string | number> = {
      spic,
      packageCode,
      vatPercent,
    };
    if (tin) receiptParams.TIN = tin;
    else if (pinfl) receiptParams.PINFL = pinfl;

    return {
      cartId: input.cartId,
      receiptType: 'PURCHASE',
      total: input.amountTiyin,
      items: [
        {
          title: input.title,
          productId: input.productId,
          quantity: 1,
          unitPrice: input.amountTiyin,
          total: input.amountTiyin,
          receiptParams,
        },
      ],
    };
  }

  private resolveSignature(): string {
    if (this.signatureCache) return this.signatureCache;

    const explicit = this.config.get<string>('UZUM_CHECKOUT_SIGNATURE')?.trim();
    if (explicit) {
      this.signatureCache = explicit;
      return explicit;
    }

    const certPath = this.config.get<string>('UZUM_CHECKOUT_CERT_PATH')?.trim();
    if (certPath && existsSync(certPath)) {
      const digest = createHash('sha256').update(readFileSync(certPath)).digest('hex');
      this.signatureCache = digest;
      return digest;
    }

    throw new Error('Uzum checkout signature is not configured');
  }

  private resolveHttpsAgent(): Agent | undefined {
    if (this.httpsAgent) return this.httpsAgent;

    const certPath = this.config.get<string>('UZUM_CHECKOUT_CERT_PATH')?.trim();
    const keyPath = this.config.get<string>('UZUM_CHECKOUT_KEY_PATH')?.trim();
    if (!certPath || !keyPath || !existsSync(certPath) || !existsSync(keyPath)) {
      return undefined;
    }

    this.httpsAgent = new Agent({
      cert: readFileSync(certPath),
      key: readFileSync(keyPath),
      rejectUnauthorized: true,
    });
    return this.httpsAgent;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Content-Language': this.contentLanguage(),
      'X-Terminal-Id': this.terminalId(),
    };

    const apiKey = this.config.get<string>('UZUM_CHECKOUT_API_KEY')?.trim();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    try {
      headers['X-Signature'] = this.resolveSignature();
    } catch (err) {
      if (!apiKey) {
        throw err;
      }
      this.logger.warn(
        `Uzum X-Signature unavailable (${err instanceof Error ? err.message : err}) — using API key only`,
      );
    }

    return headers;
  }

  private async request<T>(path: string, body: unknown): Promise<UzumApiResponse<T>> {
    const url = new URL(`${this.baseUrl()}${path}`);
    const payload = JSON.stringify(body);
    const headers = this.buildHeaders();
    const agent = this.resolveHttpsAgent();

    const text = agent
      ? await this.postWithAgent(url, payload, headers, agent)
      : await this.postWithFetch(url, payload, headers);

    let parsed: UzumApiResponse<T>;
    try {
      parsed = JSON.parse(text) as UzumApiResponse<T>;
    } catch {
      throw new Error(`Uzum API ${path} invalid JSON: ${text.slice(0, 200)}`);
    }

    if (parsed.errorCode !== 0) {
      throw new Error(
        `Uzum API ${path} failed (code ${parsed.errorCode}): ${parsed.message ?? text.slice(0, 200)}`,
      );
    }

    return parsed;
  }

  private postWithFetch(url: URL, payload: string, headers: Record<string, string>): Promise<string> {
    return fetch(url, {
      method: 'POST',
      headers,
      body: payload,
    }).then(async (response) => {
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Uzum API HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      return text;
    });
  }

  private postWithAgent(
    url: URL,
    payload: string,
    headers: Record<string, string>,
    agent: Agent,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = httpsRequest(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || 443,
          path: `${url.pathname}${url.search}`,
          method: 'POST',
          headers: {
            ...headers,
            'Content-Length': Buffer.byteLength(payload),
          },
          agent,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            if ((res.statusCode ?? 500) >= 400) {
              reject(new Error(`Uzum API HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
              return;
            }
            resolve(text);
          });
        },
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}
