import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Permission } from '../entities/permission.entity';
import { AuthModule } from '../auth/auth.module';

import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission]),
    AuthModule,
  ],
  controllers: [
    PermissionsController,
  ],
  providers: [
    PermissionsService,
  ],
  exports: [
    TypeOrmModule,
    PermissionsService,
  ],
})
export class PermissionsModule {}