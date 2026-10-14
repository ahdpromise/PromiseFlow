import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivitiesModule } from '../activities/activities.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { Workflow } from '../entities/workflow.entity';

import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow]),
    AuthModule,
    ActivitiesModule,
    AuditLogsModule,
  ],

  controllers: [WorkflowsController],

  providers: [WorkflowsService],

  exports: [WorkflowsService],
})
export class WorkflowsModule {}