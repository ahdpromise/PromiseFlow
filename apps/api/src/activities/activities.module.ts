import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Activity } from '../entities/activity.entity';

import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity]),
    AuthModule,
  ],

  controllers: [ActivitiesController],

  providers: [ActivitiesService],

  exports: [ActivitiesService],
})
export class ActivitiesModule {}