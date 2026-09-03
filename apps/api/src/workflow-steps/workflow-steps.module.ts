import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { WorkflowStep } from '../entities/workflow-step.entity';

import { WorkflowStepsController } from './workflow-steps.controller';
import { WorkflowStepsService } from './workflow-steps.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowStep]),
    AuthModule,
  ],

  controllers: [WorkflowStepsController],

  providers: [WorkflowStepsService],

  exports: [WorkflowStepsService],
})
export class WorkflowStepsModule {}