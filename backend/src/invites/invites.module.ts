import { Module } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { AuthModule } from '../common/auth/auth.module';
import { ServersModule } from '../servers/servers.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, ServersModule, RealtimeModule],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
