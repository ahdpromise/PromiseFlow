import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

import { OrganizationsModule } from './organizations/organizations.module';
import { MembershipsModule } from './memberships/memberships.module';

import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolePermissionsModule } from './role-permissions/role-permissions.module';

import { SessionsModule } from './sessions/sessions.module';

import { InvitationsModule } from './invitations/invitations.module';

import { TeamsModule } from './teams/teams.module';
import { TeamMembersModule } from './team-members/team-members.module';

import { ProjectsModule } from './projects/projects.module';
import { ProjectMembersModule } from './project-members/project-members.module';

import { WorkflowsModule } from './workflows/workflows.module';
import { WorkflowStepsModule } from './workflow-steps/workflow-steps.module';
import { WorkflowTransitionsModule } from './workflow-transitions/workflow-transitions.module';

import { TasksModule } from './tasks/tasks.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { CommentsModule } from './comments/comments.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivitiesModule } from './activities/activities.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

import { PlansModule } from './plans/plans.module';
import { FeaturesModule } from './features/features.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),

    UsersModule,
    AuthModule,

    OrganizationsModule,
    MembershipsModule,

    RolesModule,
    PermissionsModule,
    RolePermissionsModule,

    SessionsModule,

    InvitationsModule,

    TeamsModule,
    TeamMembersModule,

    ProjectsModule,
    ProjectMembersModule,

    WorkflowsModule,
    WorkflowStepsModule,
    WorkflowTransitionsModule,

    TasksModule,
    ApprovalsModule,
    CommentsModule,
    FilesModule,
    NotificationsModule,
    ActivitiesModule,
    AuditLogsModule,

    PlansModule,
    FeaturesModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}