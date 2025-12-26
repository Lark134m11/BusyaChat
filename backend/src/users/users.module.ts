import { Module } from '@nestjs/common';
import { AuthModule } from '../common/auth/auth.module';

@Module({
  imports: [AuthModule],
})
export class UsersModule {}
