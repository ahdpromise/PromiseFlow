import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { ProjectMember } from '../entities/project-member.entity';

import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersService } from './project-members.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectMember]),
    AuthModule,
  ],

  controllers: [ProjectMembersController],

  providers: [ProjectMembersService],

  exports: [ProjectMembersService],
})
export class ProjectMembersModule {}