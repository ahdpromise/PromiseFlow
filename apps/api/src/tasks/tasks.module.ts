
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivitiesModule } from '../activities/activities.module';
import { AuthModule } from '../auth/auth.module';
import { AutomationsModule } from '../automations/automations.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Task } from '../entities/task.entity';
import { MembershipsModule } from '../memberships/memberships.module';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    AuthModule,
    AuditLogsModule,
    ActivitiesModule,
    AutomationsModule,
    MembershipsModule,
  ],

  controllers: [TasksController],

  providers: [TasksService],

  exports: [TasksService],
})
export class TasksModule {}
