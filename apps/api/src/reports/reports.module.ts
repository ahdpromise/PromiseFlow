import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Approval } from '../entities/approval.entity';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Project,
      Task,
      Approval,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}