import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Approval } from '../entities/approval.entity';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async findAll(
    currentUserId: string,
    taskId: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Approval);

        return repository.find({
          where: {
            task_id: taskId,
            deleted_at: IsNull(),
          },
          order: {
            created_at: 'DESC',
          },
        });
      },
    );
  }

  async create(
    currentUserId: string,
    taskId: string,
    approverUserId: string,
    comment?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Approval);

        const approval = repository.create({
          task_id: taskId,
          approver_user_id: approverUserId,
          status: 'pending',
          comment: comment ?? null,
        });

        return repository.save(approval);
      },
    );
  }

  async decide(
    currentUserId: string,
    approvalId: string,
    status: 'approved' | 'rejected',
    comment?: string,
  ) {
    return this.rlsContextService.run(
      currentUserId,
      async (manager) => {
        const repository = manager.getRepository(Approval);

        await repository.update(
          {
            id: approvalId,
          },
          {
            status,
            comment: comment ?? null,
            decided_at: new Date(),
          },
        );

        return repository.findOne({
          where: {
            id: approvalId,
            deleted_at: IsNull(),
          },
        });
      },
    );
  }
}