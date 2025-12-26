import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, avatarUrl: true, status: true, createdAt: true },
    });
  }

  async updateMe(userId: string, data: { username?: string; status?: any; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        username: data.username?.trim(),
        status: data.status ?? undefined,
        avatarUrl: data.avatarUrl ?? undefined,
      },
      select: { id: true, email: true, username: true, avatarUrl: true, status: true },
    });
  }

  async searchUsers(query: string) {
    const clean = query.trim();
    if (!clean) return [];
    return this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: clean, mode: 'insensitive' } },
          { email: { contains: clean, mode: 'insensitive' } },
        ],
      },
      take: 20,
      select: { id: true, username: true, avatarUrl: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
