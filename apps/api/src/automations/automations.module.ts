import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivitiesModule } from '../activities/activities.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { AutomationRun } from '../entities/automation-run.entity';
import { Automation } from '../entities/automation.entity';
import { Approval } from '../entities/approval.entity';
import { Task } from '../entities/task.entity';
import { NotificationsModule } from '../notifications/notifications.module';

import { AutomationExecutionService } from './automation-execution.service';
import { AutomationsController } from './automations.controller';
import { AutomationsService } from './automations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Automation,
      AutomationRun,
      Approval,
      Task,
    ]),
    AuthModule,
    NotificationsModule,
    ActivitiesModule,
    AuditLogsModule,
  ],

  controllers: [AutomationsController],

  providers: [
    AutomationsService,
    AutomationExecutionService,
  ],

  exports: [
    AutomationsService,
    AutomationExecutionService,
  ],
})
export class AutomationsModule {}