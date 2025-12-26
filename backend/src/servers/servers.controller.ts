import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ServersService } from './servers.service';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ServerRole } from '@prisma/client';

class CreateServerDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  iconUrl?: string;
}

class RenameServerDto {
  @IsString()
  @MinLength(2)
  name!: string;
}

class UpdateMemberRoleDto {
  @IsEnum(ServerRole)
  role!: ServerRole;
}

class BanMemberDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('servers')
@UseGuards(JwtGuard)
export class ServersController {
  constructor(private readonly servers: ServersService) {}

  @Get('@me')
  async my(@CurrentUser() user: any) {
    return this.servers.myServers(user.sub);
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreateServerDto) {
    return this.servers.createServer(user.sub, dto.name, dto.iconUrl);
  }

  @Patch(':id')
  async rename(@CurrentUser() user: any, @Param('id') serverId: string, @Body() dto: RenameServerDto) {
    return this.servers.renameServer(serverId, user.sub, dto.name);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: any, @Param('id') serverId: string) {
    return this.servers.deleteServer(serverId, user.sub);
  }

  @Get(':id/members')
  async members(@CurrentUser() user: any, @Param('id') serverId: string) {
    return this.servers.listMembers(serverId, user.sub);
  }

  @Patch(':id/members/:userId/role')
  async updateRole(
    @CurrentUser() user: any,
    @Param('id') serverId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.servers.updateMemberRole(serverId, user.sub, targetUserId, dto.role);
  }

  @Post(':id/members/:userId/kick')
  async kick(@CurrentUser() user: any, @Param('id') serverId: string, @Param('userId') targetUserId: string) {
    return this.servers.kickMember(serverId, user.sub, targetUserId);
  }

  @Post(':id/members/:userId/ban')
  async ban(
    @CurrentUser() user: any,
    @Param('id') serverId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: BanMemberDto,
  ) {
    return this.servers.banMember(serverId, user.sub, targetUserId, dto.reason);
  }
}
