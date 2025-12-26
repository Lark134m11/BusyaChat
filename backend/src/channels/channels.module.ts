import { Module } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelAdminController, ChannelsController } from './channels.controller';
import { ServersModule } from '../servers/servers.module';
import { AuthModule } from '../common/auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, ServersModule, RealtimeModule],
  controllers: [ChannelsController, ChannelAdminController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
