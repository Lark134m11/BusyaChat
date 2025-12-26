import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';

import { ServersModule } from '../servers/servers.module';
import { AuthModule } from '../common/auth/auth.module'; // 👈 ВАЖНО: именно этот путь (или тот, где твой auth.module.ts реально лежит)

@Module({
  imports: [AuthModule, ServersModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
})
export class ChannelsModule {}
