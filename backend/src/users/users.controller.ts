import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../common/auth/jwt.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { UsersService } from './users.service';
import { IsOptional, IsString } from 'class-validator';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

@Controller('users')
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: any) {
    return this.users.getMe(user.sub);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: any, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.sub, dto);
  }
}
