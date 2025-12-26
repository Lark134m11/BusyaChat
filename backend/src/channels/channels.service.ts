import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService, private readonly servers: ServersService) {}

  async list(serverId: string, userId: string) {
    await this.servers.ensureMember(serverId, userId);
    return this.prisma.channel.findMany({
      where: { serverId },
      select: { id: true, name: true, type: true, position: true },
      orderBy: { position: 'asc' },
    });
  }

  async create(serverId: string, userId: string, name: string) {
    await this.servers.ensureMember(serverId, userId);

    const clean = name.trim();
    if (clean.length < 1) throw new BadRequestException('Channel name too short');

    const last = await this.prisma.channel.findFirst({
      where: { serverId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return this.prisma.channel.create({
      data: { serverId, name: clean, type: 'TEXT', position: (last?.position ?? 0) + 1 },
      select: { id: true, name: true, type: true, position: true },
    });
  }
}
