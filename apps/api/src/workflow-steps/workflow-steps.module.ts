import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivitiesModule } from '../activities/activities.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { WorkflowStep } from '../entities/workflow-step.entity';

import { WorkflowStepsController } from './workflow-steps.controller';
import { WorkflowStepsService } from './workflow-steps.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkflowStep]),
    AuthModule,
    ActivitiesModule,
    AuditLogsModule,
  ],

  controllers: [WorkflowStepsController],

  providers: [WorkflowStepsService],

  exports: [WorkflowStepsService],
})
export class WorkflowStepsModule {}