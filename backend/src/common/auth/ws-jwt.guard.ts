import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: any = context.switchToWs().getClient();

    // пробуем взять токен из handshake
    const authHeader =
      client?.handshake?.headers?.authorization ||
      client?.handshake?.auth?.token ||
      client?.handshake?.query?.token;

    const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (!raw) throw new UnauthorizedException('Missing token');

    const token = typeof raw === 'string' && raw.startsWith('Bearer ') ? raw.slice(7).trim() : String(raw);

    try {
      const payload = this.jwt.verify(token);
      if (payload?.typ && payload.typ !== 'access') {
        throw new UnauthorizedException('Invalid token');
      }
      client.user = payload;
      client.data = client.data ?? {};
      client.data.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
