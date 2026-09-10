import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';

import { RolePermissionsController } from './role-permissions.controller';
import { RolePermissionsService } from './role-permissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RolePermission,
      Permission,
    ]),
    AuthModule,
  ],
  controllers: [
    RolePermissionsController,
  ],
  providers: [
    RolePermissionsService,
  ],
  exports: [
    TypeOrmModule,
    RolePermissionsService,
  ],
})
export class RolePermissionsModule {}