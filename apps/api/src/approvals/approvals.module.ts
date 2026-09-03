import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Approval } from '../entities/approval.entity';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Approval]),
    AuthModule,
  ],

  controllers: [ApprovalsController],

  providers: [ApprovalsService],

  exports: [ApprovalsService],
})
export class ApprovalsModule {}