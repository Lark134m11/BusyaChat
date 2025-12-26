import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

class CreateInviteDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

@Controller()
@UseGuards(JwtGuard)
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post('servers/:serverId/invites')
  async create(
    @Param('serverId') serverId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateInviteDto,
  ) {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    return this.invites.createInvite(serverId, user.sub, dto.maxUses, expiresAt);
  }

  @Get('servers/:serverId/invites')
  async list(@Param('serverId') serverId: string, @CurrentUser() user: any) {
    return this.invites.listInvites(serverId, user.sub);
  }

  @Delete('invites/:code')
  async revoke(@Param('code') code: string, @CurrentUser() user: any) {
    return this.invites.revoke(code, user.sub);
  }

  @Post('invites/:code/join')
  async join(@Param('code') code: string, @CurrentUser() user: any) {
    return this.invites.join(code, user.sub);
  }
}
