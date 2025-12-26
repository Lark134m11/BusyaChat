import { Controller, Get, Req } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Get('ping')
  ping(@Req() req: any) {
    return { ok: true, message: 'auth works', ip: req.ip };
  }
}
