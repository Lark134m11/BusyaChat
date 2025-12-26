import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { DirectService } from './direct.service';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

class SendDirectDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  attachmentIds?: string[];
}

class EditDirectDto {
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

@Controller('direct')
@UseGuards(JwtGuard)
export class DirectController {
  constructor(private readonly direct: DirectService) {}

  @Get()
  async list(@CurrentUser() user: any) {
    return this.direct.listThreads(user.sub);
  }

  @Post(':userId')
  async start(@CurrentUser() user: any, @Param('userId') otherUserId: string) {
    return this.direct.startThread(user.sub, otherUserId);
  }

  @Get(':threadId/messages')
  async history(
    @CurrentUser() user: any,
    @Param('threadId') threadId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.direct.history(threadId, user.sub, cursor, limit ? Number(limit) : 50);
  }

  @Get(':threadId/messages/search')
  async search(
    @CurrentUser() user: any,
    @Param('threadId') threadId: string,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.direct.search(threadId, user.sub, query ?? '', limit ? Number(limit) : 20);
  }

  @Post(':threadId/messages')
  async send(
    @CurrentUser() user: any,
    @Param('threadId') threadId: string,
    @Body() dto: SendDirectDto,
  ) {
    return this.direct.send(threadId, user.sub, dto.content ?? '', dto.attachmentIds);
  }

  @Post(':threadId/read')
  async markRead(@CurrentUser() user: any, @Param('threadId') threadId: string, @Body() dto: MarkReadDto) {
    return this.direct.markRead(threadId, user.sub, dto.messageId);
  }

  @Patch('messages/:id')
  async edit(@CurrentUser() user: any, @Param('id') messageId: string, @Body() dto: EditDirectDto) {
    return this.direct.edit(messageId, user.sub, dto.content);
  }

  @Delete('messages/:id')
  async remove(@CurrentUser() user: any, @Param('id') messageId: string) {
    return this.direct.remove(messageId, user.sub);
  }

  @Post('messages/:id/reactions')
  async addReaction(@CurrentUser() user: any, @Param('id') messageId: string, @Body() dto: ReactionDto) {
    return this.direct.addReaction(messageId, user.sub, dto.emoji);
  }

  @Delete('messages/:id/reactions')
  async removeReaction(@CurrentUser() user: any, @Param('id') messageId: string, @Body() dto: ReactionDto) {
    return this.direct.removeReaction(messageId, user.sub, dto.emoji);
  }
}
