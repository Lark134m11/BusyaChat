import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  // Минимально: выдаём токен на основе userId
  signToken(userId: number) {
    return this.jwt.sign({ sub: userId });
  }

  // Минимально: проверка токена (для гардов)
  verifyToken(token: string) {
    try {
      return this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
