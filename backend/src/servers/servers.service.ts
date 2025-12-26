import { BadRequestException, Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServersService {
  constructor(private readonly prisma: PrismaService) {}

  async myServers(userId: string) {
    const memberships = await this.prisma.serverMember.findMany({
      where: { userId },
      include: {
        server: { select: { id: true, name: true, iconUrl: true, ownerId: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => m.server);
  }

  async createServer(userId: string, name: string) {
    const clean = name.trim();
    if (clean.length < 2) throw new BadRequestException('Server name too short');

    // create server + owner membership + default "general" text channel
    const server = await this.prisma.server.create({
      data: {
        name: clean,
        ownerId: userId,
        members: { create: { userId } },
        channels: { create: { name: 'general', type: 'TEXT', position: 0 } },
      },
      select: { id: true, name: true, iconUrl: true, ownerId: true },
    });

    return server;
  }

  async ensureMember(serverId: string, userId: string) {
    const m = await this.prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (!m) throw new ForbiddenException('Not a server member');
    return true;
  }
}
