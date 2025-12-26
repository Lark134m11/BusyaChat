import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nickname: true, about: true, avatarUrl: true, status: true, createdAt: true },
    });
  }

  async updateMe(userId: string, data: { nickname?: string; about?: string; status?: any; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: data.nickname?.trim(),
        about: data.about ?? undefined,
        status: data.status ?? undefined,
        avatarUrl: data.avatarUrl ?? undefined,
      },
      select: { id: true, email: true, nickname: true, about: true, avatarUrl: true, status: true },
    });
  }
}
