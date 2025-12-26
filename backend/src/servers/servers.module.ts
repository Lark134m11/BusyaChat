import { Module } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { AuthModule } from '../common/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ServersController],
  providers: [ServersService],
  exports: [ServersService], // ✅ ВОТ ЭТО ДОБАВЬ
})
export class ServersModule {}
