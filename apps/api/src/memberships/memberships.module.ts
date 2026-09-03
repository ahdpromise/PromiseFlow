import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Membership } from '../entities/membership.entity';

import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { OrganizationAccessService } from './organization-access.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Membership]),
    AuthModule,
  ],

  controllers: [MembershipsController],

  providers: [
    MembershipsService,
    OrganizationAccessService,
  ],

  exports: [
    MembershipsService,
    OrganizationAccessService,
  ],
})
export class MembershipsModule {}