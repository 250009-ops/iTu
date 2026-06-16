import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class TotpService {
  constructor(private config: ConfigService) {}

  createSecret() {
    return generateSecret();
  }

  buildOtpauthUrl(secret: string, email: string) {
    const issuer = this.config.get('APP_NAME', 'itestu');
    return generateURI({
      issuer,
      label: email,
      secret,
    });
  }

  async toQrDataUrl(otpauthUrl: string) {
    return QRCode.toDataURL(otpauthUrl);
  }

  async verifyCode(secret: string, token: string) {
    const result = await verify({ secret, token });
    return result.valid;
  }
}
