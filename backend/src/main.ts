import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('BACKEND_PORT') ?? '4000');
  const corsOrigin = config.get<string>('CORS_ORIGIN') ?? 'http://localhost:5173';

  app.use(cookieParser());
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[busya] backend up on http://localhost:${port}`);
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});