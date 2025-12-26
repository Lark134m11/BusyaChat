import { Controller, Get, Param, Post, Query, UseGuards, Body } from '@nestjs/common';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { MessagesService } from './messages.service';
import { IsOptional, IsString, MinLength } from 'class-validator';

class SendMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;
}

@Controller('channels/:channelId/messages')
@UseGuards(JwtGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  async history(
    @Param('channelId') channelId: string,
    @CurrentUser() user: any,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messages.history(channelId, user.sub, before, limit ? Number(limit) : 50);
  }

  @Post()
  async send(@Param('channelId') channelId: string, @CurrentUser() user: any, @Body() dto: SendMessageDto) {
    return this.messages.send(channelId, user.sub, dto.content, dto.replyToId);
  }
}
