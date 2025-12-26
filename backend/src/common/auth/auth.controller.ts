import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto';
import { JwtGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';


@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email.toLowerCase().trim(), dto.password, dto.nickname);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email.toLowerCase().trim(), dto.password);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  async logout(@CurrentUser() user: any) {
    return this.auth.logout(user.sub);
  }
}
