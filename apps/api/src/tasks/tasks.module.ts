import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { Task } from '../entities/task.entity';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    AuthModule,
    AuditLogsModule,
  ],

  controllers: [TasksController],

  providers: [TasksService],

  exports: [TasksService],
})
export class TasksModule {}