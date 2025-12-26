import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token');
    }

    const token = auth.slice(7);

    try {
      const payload = this.jwt.verify(token);
      if (payload?.typ && payload.typ !== 'access') {
        throw new UnauthorizedException('Invalid token');
      }
      (req as any).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Bad token');
    }
  }
}
