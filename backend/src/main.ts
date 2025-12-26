import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? '4000');
  const corsOriginRaw =
    config.get<string>('CLIENT_URL') ?? 'http://127.0.0.1:5173,http://localhost:5173';
  const corsOrigins = new Set(
    corsOriginRaw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  // Ensure localhost/127.0.0.1 pair are both allowed in dev.
  if (corsOrigins.has('http://127.0.0.1:5173')) corsOrigins.add('http://localhost:5173');
  if (corsOrigins.has('http://localhost:5173')) corsOrigins.add('http://127.0.0.1:5173');

  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === 'null') return callback(null, true);
      if (origin.startsWith('file://') || origin.startsWith('app://')) return callback(null, true);
      if (corsOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[busya] backend up on http://localhost:${port}`);
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
