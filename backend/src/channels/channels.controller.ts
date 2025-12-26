import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ChannelsService } from './channels.service';
import { IsString, MinLength } from 'class-validator';

class CreateChannelDto {
  @IsString()
  @MinLength(1)
  name!: string;
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
    return this.channels.create(serverId, user.sub, dto.name);
  }
}
