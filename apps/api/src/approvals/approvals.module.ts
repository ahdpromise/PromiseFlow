import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivitiesModule } from '../activities/activities.module';
import { AutomationsModule } from '../automations/automations.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { Approval } from '../entities/approval.entity';
import { NotificationsModule } from '../notifications/notifications.module';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Approval]),
    AuthModule,
    NotificationsModule,
    AutomationsModule,
    ActivitiesModule,
    AuditLogsModule,
  ],

  controllers: [ApprovalsController],

  providers: [ApprovalsService],

  exports: [ApprovalsService],
})
export class ApprovalsModule {}