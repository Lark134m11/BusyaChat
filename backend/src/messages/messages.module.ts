import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesAdminController, MessagesController } from './messages.controller';

import { AuthModule } from '../common/auth/auth.module';
import { ServersModule } from '../servers/servers.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
  imports: [AuthModule, ServersModule, RealtimeModule, ChannelsModule],
  controllers: [MessagesController, MessagesAdminController],
  providers: [MessagesService],
})
export class MessagesModule {}
