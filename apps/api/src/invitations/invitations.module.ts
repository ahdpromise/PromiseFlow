
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivitiesModule } from '../activities/activities.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { Invitation } from '../entities/invitation.entity';
import { MembershipsModule } from '../memberships/memberships.module';

import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    AuthModule,
    EmailModule,
    ActivitiesModule,
    AuditLogsModule,
    MembershipsModule,
  ],

  controllers: [InvitationsController],

  providers: [InvitationsService],

  exports: [InvitationsService],
})
export class InvitationsModule {}
