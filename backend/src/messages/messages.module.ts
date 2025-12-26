import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';

import { AuthModule } from '../common/auth/auth.module'; // 👈 ВАЖНО: правильный путь
import { ServersModule } from '../servers/servers.module';
import { RealtimeModule } from '../realtime/realtime.module';
// если messages.service юзает ChannelsService/ServersService — добавь эти модули тоже:
// import { ChannelsModule } from '../channels/channels.module';
// import { ServersModule } from '../servers/servers.module';

@Module({
  imports: [AuthModule, ServersModule, RealtimeModule], // + ChannelsModule/ServersModule если нужно
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
