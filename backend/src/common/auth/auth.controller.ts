import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';
import type { Request } from 'express';


@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email.toLowerCase().trim(), dto.password, dto.username.trim());
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email.toLowerCase().trim(), dto.password);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    const token = dto.refreshToken ?? req.cookies?.refreshToken;
    if (!token) throw new BadRequestException('Missing refresh token');
    return this.auth.refresh(token);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  async logout(@CurrentUser() user: any) {
    return this.auth.logout(user.sub);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async me(@CurrentUser() user: any) {
    return this.auth.me(user.sub);
  }
}
