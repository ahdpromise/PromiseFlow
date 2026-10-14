import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsNull } from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Approval } from '../entities/approval.entity';
import { Organization } from '../entities/organization.entity';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';
import { Team } from '../entities/team.entity';

@Injectable()
export class DashboardService {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {}

  async getDashboard(
    userId: string,
    organizationId: string,
  ) {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const organizationsRepository =
          manager.getRepository(Organization);

        const projectsRepository =
          manager.getRepository(Project);

        const tasksRepository =
          manager.getRepository(Task);

        const teamsRepository =
          manager.getRepository(Team);

        const approvalsRepository =
          manager.getRepository(Approval);

        const organization =
          await organizationsRepository.findOne({
            where: {
              id: organizationId,
              deleted_at: IsNull(),
            },
          });

        if (!organization) {
          throw new NotFoundException(
            'Organization not found or inaccessible',
          );
        }

        const [projects, teams] =
          await Promise.all([
            projectsRepository.find({
              where: {
                organization_id: organizationId,
                deleted_at: IsNull(),
              },
              order: {
                created_at: 'DESC',
              },
            }),
            teamsRepository.find({
              where: {
                organization_id: organizationId,
                deleted_at: IsNull(),
              },
              order: {
                created_at: 'DESC',
              },
            }),
          ]);

        const projectIds = projects.map(
          (project) => project.id,
        );

        const tasks =
          projectIds.length > 0
            ? await tasksRepository
                .createQueryBuilder('task')
                .where(
                  'task.project_id IN (:...projectIds)',
                  {
                    projectIds,
                  },
                )
                .andWhere(
                  'task.deleted_at IS NULL',
                )
                .orderBy(
                  'task.created_at',
                  'DESC',
                )
                .getMany()
            : [];

        const taskIds = tasks.map(
          (task) => task.id,
        );

        const approvals =
          taskIds.length > 0
            ? await approvalsRepository
                .createQueryBuilder(
                  'approval',
                )
                .where(
                  'approval.task_id IN (:...taskIds)',
                  {
                    taskIds,
                  },
                )
                .andWhere(
                  'approval.deleted_at IS NULL',
                )
                .orderBy(
                  'approval.created_at',
                  'DESC',
                )
                .getMany()
            : [];

        return {
          organization,
          projects,
          tasks,
          teams,
          approvals,
        };
      },
    );
  }
}