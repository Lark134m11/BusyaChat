import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ServersService } from './servers.service';
import { IsString, MinLength } from 'class-validator';

class CreateServerDto {
  @IsString()
  @MinLength(2)
  name!: string;
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
    return this.servers.createServer(user.sub, dto.name);
  }
}
