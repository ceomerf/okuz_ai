import { Global, Module } from '@nestjs/common';
import { SolverService } from './solver.service';

@Global()
@Module({
  providers: [SolverService],
  exports: [SolverService],
})
export class SolverModule {}


