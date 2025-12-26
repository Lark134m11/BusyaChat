import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { MessagesService } from './messages.service';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

class SendMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  attachmentIds?: string[];
}

class EditMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

class ReactionDto {
  @IsString()
  emoji!: string;
}

class MarkReadDto {
  @IsOptional()
  @IsString()
  messageId?: string;
}

@Controller('channels/:channelId/messages')
@UseGuards(JwtGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  async history(
    @Param('channelId') channelId: string,
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messages.history(channelId, user.sub, cursor, limit ? Number(limit) : 50);
  }

  @Get('search')
  async search(
    @Param('channelId') channelId: string,
    @CurrentUser() user: any,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messages.search(channelId, user.sub, query ?? '', limit ? Number(limit) : 20);
  }

  @Post()
  async send(@Param('channelId') channelId: string, @CurrentUser() user: any, @Body() dto: SendMessageDto) {
    return this.messages.send(channelId, user.sub, dto.content ?? '', dto.attachmentIds);
  }

  @Post('/read')
  async markRead(@Param('channelId') channelId: string, @CurrentUser() user: any, @Body() dto: MarkReadDto) {
    return this.messages.markRead(channelId, user.sub, dto.messageId);
  }
}

@Controller('messages')
@UseGuards(JwtGuard)
export class MessagesAdminController {
  constructor(private readonly messages: MessagesService) {}

  @Patch(':id')
  async edit(@Param('id') messageId: string, @CurrentUser() user: any, @Body() dto: EditMessageDto) {
    return this.messages.edit(messageId, user.sub, dto.content);
  }

  @Delete(':id')
  async remove(@Param('id') messageId: string, @CurrentUser() user: any) {
    return this.messages.remove(messageId, user.sub);
  }

  @Post(':id/reactions')
  async addReaction(@Param('id') messageId: string, @CurrentUser() user: any, @Body() dto: ReactionDto) {
    return this.messages.addReaction(messageId, user.sub, dto.emoji);
  }

  @Delete(':id/reactions')
  async removeReaction(@Param('id') messageId: string, @CurrentUser() user: any, @Body() dto: ReactionDto) {
    return this.messages.removeReaction(messageId, user.sub, dto.emoji);
  }
}
