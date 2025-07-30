import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Modülü global yapar
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Servisin diğer modüllerde kullanılması için dışa aktar
})
export class PrismaModule {}
