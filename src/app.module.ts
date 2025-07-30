import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmartToolsController } from './controllers/smart-tools.controller';
import { SmartToolsService } from './services/smart-tools.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  controllers: [SmartToolsController],
  providers: [SmartToolsService],
})
export class AppModule {}
