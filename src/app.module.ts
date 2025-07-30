import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmartToolsController } from './controllers/smart-tools.controller';
import { SmartToolsService } from './services/smart-tools.service';
import { HealthController } from './controllers/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [SmartToolsController, HealthController],
  providers: [SmartToolsService],
})
export class AppModule {}
