import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private accessTtlSeconds(): number {
    return Number(this.config.get<string>('ACCESS_TOKEN_TTL_SECONDS') ?? '900');
  }

  private refreshTtlSeconds(): number {
    return Number(this.config.get<string>('REFRESH_TOKEN_TTL_SECONDS') ?? '1209600');
  }

  private accessSecret(): string {
    const s = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!s) throw new Error('JWT_ACCESS_SECRET missing');
    return s;
  }

  private refreshSecret(): string {
    const s = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!s) throw new Error('JWT_REFRESH_SECRET missing');
    return s;
  }

  private async signTokens(userId: string, email: string): Promise<Tokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: this.accessSecret(), expiresIn: this.accessTtlSeconds() },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, typ: 'refresh' },
      { secret: this.refreshSecret(), expiresIn: this.refreshTtlSeconds() },
    );

    return { accessToken, refreshToken };
  }

  async register(email: string, password: string, nickname?: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Email already used');

    const passwordHash = await argon2.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname: nickname?.trim() ? nickname.trim() : 'Busya',
      },
      select: { id: true, email: true, nickname: true },
    });

    const tokens = await this.signTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens(user.id, user.email);

    // rotation: revoke old tokens, create new
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, email: user.email, nickname: user.nickname, avatarUrl: user.avatarUrl, status: user.status },
      ...tokens,
    };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds() * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(refreshToken, { secret: this.refreshSecret() });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload?.sub as string | undefined;
    const email = payload?.email as string | undefined;
    if (!userId || !email) throw new UnauthorizedException('Invalid refresh token');

    const records = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    let matched: { id: string } | null = null;
    for (const r of records) {
      const ok = await argon2.verify(r.tokenHash, refreshToken);
      if (ok) {
        matched = { id: r.id };
        break;
      }
    }

    if (!matched) throw new UnauthorizedException('Refresh token not found');

    // revoke matched token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.signTokens(userId, email);
    await this.saveRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}
