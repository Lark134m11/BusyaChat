import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt.guard';
import { WsJwtGuard } from './ws-jwt.guard';

@Global()
@Module({
  imports: [
    // если у тебя в AppModule уже есть ConfigModule.forRoot({ isGlobal: true }),
    // то тут ConfigModule можно вообще не импортировать.
    // Но оставим — не ломает.
    ConfigModule,

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET') || 'dev_secret_change_me',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtGuard, WsJwtGuard],
  exports: [
    // экспортируем, чтобы другие модули могли инжектить JwtService и использовать JwtGuard
    JwtModule,
    AuthService,
    JwtGuard,
    WsJwtGuard,
  ],
})
export class AuthModule {}
