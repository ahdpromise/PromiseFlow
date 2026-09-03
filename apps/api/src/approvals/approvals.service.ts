import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Approval } from '../entities/approval.entity';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(Approval)
    private readonly approvalsRepository: Repository<Approval>,
  ) {}

  async findAll(taskId: string) {
    return this.approvalsRepository.find({
      where: {
        task_id: taskId,
        deleted_at: IsNull(),
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async create(
    taskId: string,
    approverUserId: string,
    comment?: string,
  ) {
    const approval = this.approvalsRepository.create({
      task_id: taskId,
      approver_user_id: approverUserId,
      status: 'pending',
      comment: comment ?? null,
    });

    return this.approvalsRepository.save(approval);
  }

  async decide(
    approvalId: string,
    status: 'approved' | 'rejected',
    comment?: string,
  ) {
    await this.approvalsRepository.update(
      {
        id: approvalId,
      },
      {
        status,
        comment: comment ?? null,
        decided_at: new Date(),
      },
    );

    return this.approvalsRepository.findOne({
      where: {
        id: approvalId,
      },
    });
  }
}