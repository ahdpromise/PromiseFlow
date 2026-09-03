import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { AuditLog } from '../entities/audit-log.entity';

import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    AuthModule,
  ],

  controllers: [AuditLogsController],

  providers: [AuditLogsService],

  exports: [AuditLogsService],
})
export class AuditLogsModule {}