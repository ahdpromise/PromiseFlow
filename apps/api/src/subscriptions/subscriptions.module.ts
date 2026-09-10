import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { Organization } from '../entities/organization.entity';
import { Plan } from '../entities/plans.entity';
import { Subscription } from '../entities/subscriptions.entity';

import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Subscription,
      Organization,
      Plan,
    ]),
    AuthModule,
  ],
  controllers: [
    SubscriptionsController,
  ],
  providers: [
    SubscriptionsService,
  ],
  exports: [
    SubscriptionsService,
  ],
})
export class SubscriptionsModule {}