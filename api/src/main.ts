import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get('NODE_ENV') === 'production';

  // Behind nginx — use X-Forwarded-For so rate limits apply per client IP.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Allow base64 image data URLs (e.g. teacher profile photos) in JSON bodies.
  app.useBodyParser('json', { limit: '6mb' });

  const mediaRoot = path.resolve(
    config.get<string>('MEDIA_ROOT', './storage/media'),
  );
  const serveMediaLocally =
    config.get<string>('SERVE_MEDIA_LOCALLY', 'true') === 'true';
  if (serveMediaLocally) {
    fs.mkdirSync(mediaRoot, { recursive: true });
    app.use('/media', express.static(mediaRoot, { maxAge: '7d' }));
  }

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const configured = config.get<string>(
        'CORS_ORIGIN',
        'http://localhost:3000',
      );
      const allowedOrigins = new Set(
        configured.split(',').map((value) => value.trim()),
      );

      const isDev = config.get('NODE_ENV') !== 'production';
      const isLocalDevOrigin =
        isDev &&
        /^https?:\/\/(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?$/.test(
          origin,
        );

      if (allowedOrigins.has(origin) || isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });

  if (!isProduction || config.get('SWAGGER_ENABLED') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('IELTS Mock ERP API')
      .setDescription(
        'Backend API for the IELTS computer-delivered mock exam platform',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api/v1`);
  if (!isProduction || config.get('SWAGGER_ENABLED') === 'true') {
    console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}
bootstrap();
