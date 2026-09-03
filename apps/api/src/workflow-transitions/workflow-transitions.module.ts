import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { WorkflowTransition } from '../entities/workflow-transition.entity';

import { WorkflowTransitionsController } from './workflow-transitions.controller';
import { WorkflowTransitionsService } from './workflow-transitions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowTransition]),
    AuthModule,
  ],

  controllers: [WorkflowTransitionsController],

  providers: [WorkflowTransitionsService],

  exports: [WorkflowTransitionsService],
})
export class WorkflowTransitionsModule {}