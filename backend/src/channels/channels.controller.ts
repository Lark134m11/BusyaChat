import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ChannelsService } from './channels.service';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ChannelType, ServerRole } from '@prisma/client';

class CreateChannelDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEnum(ServerRole)
  minRole?: ServerRole;

  @IsOptional()
  @IsEnum(ChannelType)
  type?: ChannelType;
}

class UpdateChannelDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsEnum(ServerRole)
  minRole?: ServerRole;
}

@Controller('servers/:serverId/channels')
@UseGuards(JwtGuard)
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Get()
  async list(@Param('serverId') serverId: string, @CurrentUser() user: any) {
    return this.channels.list(serverId, user.sub);
  }

  @Post()
  async create(@Param('serverId') serverId: string, @CurrentUser() user: any, @Body() dto: CreateChannelDto) {
    return this.channels.create(serverId, user.sub, dto.name, dto.minRole, dto.type);
  }
}

@Controller('channels')
@UseGuards(JwtGuard)
export class ChannelAdminController {
  constructor(private readonly channels: ChannelsService) {}

  @Patch(':id')
  async update(@Param('id') channelId: string, @CurrentUser() user: any, @Body() dto: UpdateChannelDto) {
    return this.channels.rename(channelId, user.sub, dto.name, dto.minRole);
  }

  @Delete(':id')
  async remove(@Param('id') channelId: string, @CurrentUser() user: any) {
    return this.channels.remove(channelId, user.sub);
  }
}
