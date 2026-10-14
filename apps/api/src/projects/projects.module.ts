import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivitiesModule } from '../activities/activities.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { Project } from '../entities/project.entity';
import { MembershipsModule } from '../memberships/memberships.module';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    AuthModule,
    MembershipsModule,
    ActivitiesModule,
    AuditLogsModule,
  ],

  controllers: [ProjectsController],

  providers: [ProjectsService],

  exports: [ProjectsService],
})
export class ProjectsModule {}