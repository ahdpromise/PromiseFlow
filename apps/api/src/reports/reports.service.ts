import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { RlsContextService } from '../database/rls-context.service';
import { Approval } from '../entities/approval.entity';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';

export type ReportsOverview = {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  completionRate: number;
};

export type TasksByStatus = {
  pending: number;
  inProgress: number;
  completed: number;
  canceled: number;
};

export type TasksByPriority = {
  low: number;
  medium: number;
  high: number;
  urgent: number;
};

export type ProjectPerformance = {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  completionRate: number;
};

export type ApprovalStatistics = {
  totalApprovals: number;
  pending: number;
  approved: number;
  rejected: number;
  approvalRate: number;
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,

    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,

    @InjectRepository(Approval)
    private readonly approvalsRepository: Repository<Approval>,

    private readonly rlsContextService: RlsContextService,
  ) {}

  private applyDateRange<Entity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<Entity>,
    column: string,
    from?: string,
    to?: string,
  ) {
    if (from) {
      queryBuilder.andWhere(
        `${column} >= :fromDate`,
        {
          fromDate: `${from}T00:00:00.000Z`,
        },
      );
    }

    if (to) {
      queryBuilder.andWhere(
        `${column} < :toDate`,
        {
          toDate: `${to}T00:00:00.000Z`,
        },
      );

      queryBuilder.setParameter(
        'toDate',
        new Date(
          new Date(
            `${to}T00:00:00.000Z`,
          ).getTime() +
            24 * 60 * 60 * 1000,
        ).toISOString(),
      );
    }

    return queryBuilder;
  }

  async getOverview(
    userId: string,
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<ReportsOverview> {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const projectsRepository =
          manager.getRepository(
            this.projectsRepository.target,
          );

        const tasksRepository =
          manager.getRepository(
            this.tasksRepository.target,
          );

        const projectsQuery =
          projectsRepository
            .createQueryBuilder('project')
            .where(
              'project.organization_id = :organizationId',
              { organizationId },
            )
            .andWhere(
              'project.deleted_at IS NULL',
            );

        this.applyDateRange(
          projectsQuery,
          'project.created_at',
          from,
          to,
        );

        const totalProjects =
          await projectsQuery.getCount();

        const taskStatsQuery =
          tasksRepository
            .createQueryBuilder('task')
            .innerJoin(
              Project,
              'project',
              'project.id = task.project_id',
            )
            .select(
              'COUNT(task.id)',
              'total_tasks',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.status = 'completed'
              )`,
              'completed_tasks',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.status IN (
                  'pending',
                  'in_progress'
                )
              )`,
              'active_tasks',
            )
            .where(
              'project.organization_id = :organizationId',
              { organizationId },
            )
            .andWhere(
              'project.deleted_at IS NULL',
            )
            .andWhere(
              'task.deleted_at IS NULL',
            );

        this.applyDateRange(
          taskStatsQuery,
          'task.created_at',
          from,
          to,
        );

        const taskStats =
          await taskStatsQuery.getRawOne<{
            total_tasks: string;
            completed_tasks: string;
            active_tasks: string;
          }>();

        const totalTasks = Number(
          taskStats?.total_tasks ?? 0,
        );

        const completedTasks = Number(
          taskStats?.completed_tasks ?? 0,
        );

        const activeTasks = Number(
          taskStats?.active_tasks ?? 0,
        );

        const completionRate =
          totalTasks === 0
            ? 0
            : Number(
                (
                  (completedTasks /
                    totalTasks) *
                  100
                ).toFixed(1),
              );

        return {
          totalProjects,
          totalTasks,
          completedTasks,
          activeTasks,
          completionRate,
        };
      },
    );
  }

  async getTasksByStatus(
    userId: string,
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<TasksByStatus> {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const tasksRepository =
          manager.getRepository(
            this.tasksRepository.target,
          );

        const query =
          tasksRepository
            .createQueryBuilder('task')
            .innerJoin(
              Project,
              'project',
              'project.id = task.project_id',
            )
            .select(
              `COUNT(task.id) FILTER (
                WHERE task.status = 'pending'
              )`,
              'pending',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.status = 'in_progress'
              )`,
              'in_progress',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.status = 'completed'
              )`,
              'completed',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.status = 'canceled'
              )`,
              'canceled',
            )
            .where(
              'project.organization_id = :organizationId',
              { organizationId },
            )
            .andWhere(
              'project.deleted_at IS NULL',
            )
            .andWhere(
              'task.deleted_at IS NULL',
            );

        this.applyDateRange(
          query,
          'task.created_at',
          from,
          to,
        );

        const stats =
          await query.getRawOne<{
            pending: string;
            in_progress: string;
            completed: string;
            canceled: string;
          }>();

        return {
          pending: Number(
            stats?.pending ?? 0,
          ),
          inProgress: Number(
            stats?.in_progress ?? 0,
          ),
          completed: Number(
            stats?.completed ?? 0,
          ),
          canceled: Number(
            stats?.canceled ?? 0,
          ),
        };
      },
    );
  }

  async getTasksByPriority(
    userId: string,
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<TasksByPriority> {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const tasksRepository =
          manager.getRepository(
            this.tasksRepository.target,
          );

        const query =
          tasksRepository
            .createQueryBuilder('task')
            .innerJoin(
              Project,
              'project',
              'project.id = task.project_id',
            )
            .select(
              `COUNT(task.id) FILTER (
                WHERE task.priority = 'low'
              )`,
              'low',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.priority = 'medium'
              )`,
              'medium',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.priority = 'high'
              )`,
              'high',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.priority = 'urgent'
              )`,
              'urgent',
            )
            .where(
              'project.organization_id = :organizationId',
              { organizationId },
            )
            .andWhere(
              'project.deleted_at IS NULL',
            )
            .andWhere(
              'task.deleted_at IS NULL',
            );

        this.applyDateRange(
          query,
          'task.created_at',
          from,
          to,
        );

        const stats =
          await query.getRawOne<{
            low: string;
            medium: string;
            high: string;
            urgent: string;
          }>();

        return {
          low: Number(
            stats?.low ?? 0,
          ),
          medium: Number(
            stats?.medium ?? 0,
          ),
          high: Number(
            stats?.high ?? 0,
          ),
          urgent: Number(
            stats?.urgent ?? 0,
          ),
        };
      },
    );
  }

  async getProjectPerformance(
    userId: string,
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<ProjectPerformance[]> {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const projectsRepository =
          manager.getRepository(
            this.projectsRepository.target,
          );

        const query =
          projectsRepository
            .createQueryBuilder('project')
            .leftJoin(
              Task,
              'task',
              `
                task.project_id = project.id
                AND task.deleted_at IS NULL
              `,
            )
            .select(
              'project.id',
              'project_id',
            )
            .addSelect(
              'project.name',
              'project_name',
            )
            .addSelect(
              'COUNT(task.id)',
              'total_tasks',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.status = 'completed'
              )`,
              'completed_tasks',
            )
            .addSelect(
              `COUNT(task.id) FILTER (
                WHERE task.status IN (
                  'pending',
                  'in_progress'
                )
              )`,
              'active_tasks',
            )
            .where(
              'project.organization_id = :organizationId',
              { organizationId },
            )
            .andWhere(
              'project.deleted_at IS NULL',
            );

        if (from) {
          query.andWhere(
            `
              (
                task.id IS NULL
                OR task.created_at >= :projectFromDate
              )
            `,
            {
              projectFromDate:
                `${from}T00:00:00.000Z`,
            },
          );
        }

        if (to) {
          const nextDay = new Date(
            new Date(
              `${to}T00:00:00.000Z`,
            ).getTime() +
              24 * 60 * 60 * 1000,
          ).toISOString();

          query.andWhere(
            `
              (
                task.id IS NULL
                OR task.created_at < :projectToDate
              )
            `,
            {
              projectToDate: nextDay,
            },
          );
        }

        const rows =
          await query
            .groupBy('project.id')
            .addGroupBy('project.name')
            .orderBy(
              'project.name',
              'ASC',
            )
            .getRawMany<{
              project_id: string;
              project_name: string;
              total_tasks: string;
              completed_tasks: string;
              active_tasks: string;
            }>();

        return rows.map((row) => {
          const totalTasks = Number(
            row.total_tasks,
          );

          const completedTasks = Number(
            row.completed_tasks,
          );

          const activeTasks = Number(
            row.active_tasks,
          );

          const completionRate =
            totalTasks === 0
              ? 0
              : Number(
                  (
                    (completedTasks /
                      totalTasks) *
                    100
                  ).toFixed(1),
                );

          return {
            projectId: row.project_id,
            projectName:
              row.project_name,
            totalTasks,
            completedTasks,
            activeTasks,
            completionRate,
          };
        });
      },
    );
  }

  async getApprovalStatistics(
    userId: string,
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<ApprovalStatistics> {
    return this.rlsContextService.run(
      userId,
      async (manager) => {
        const approvalsRepository =
          manager.getRepository(
            this.approvalsRepository.target,
          );

        const query =
          approvalsRepository
            .createQueryBuilder('approval')
            .innerJoin(
              Task,
              'task',
              'task.id = approval.task_id',
            )
            .innerJoin(
              Project,
              'project',
              'project.id = task.project_id',
            )
            .select(
              'COUNT(approval.id)',
              'total_approvals',
            )
            .addSelect(
              `COUNT(approval.id) FILTER (
                WHERE approval.status = 'pending'
              )`,
              'pending',
            )
            .addSelect(
              `COUNT(approval.id) FILTER (
                WHERE approval.status = 'approved'
              )`,
              'approved',
            )
            .addSelect(
              `COUNT(approval.id) FILTER (
                WHERE approval.status = 'rejected'
              )`,
              'rejected',
            )
            .where(
              'project.organization_id = :organizationId',
              { organizationId },
            )
            .andWhere(
              'project.deleted_at IS NULL',
            )
            .andWhere(
              'task.deleted_at IS NULL',
            )
            .andWhere(
              'approval.deleted_at IS NULL',
            );

        this.applyDateRange(
          query,
          'approval.created_at',
          from,
          to,
        );

        const stats =
          await query.getRawOne<{
            total_approvals: string;
            pending: string;
            approved: string;
            rejected: string;
          }>();

        const totalApprovals = Number(
          stats?.total_approvals ?? 0,
        );

        const pending = Number(
          stats?.pending ?? 0,
        );

        const approved = Number(
          stats?.approved ?? 0,
        );

        const rejected = Number(
          stats?.rejected ?? 0,
        );

        const decidedApprovals =
          approved + rejected;

        const approvalRate =
          decidedApprovals === 0
            ? 0
            : Number(
                (
                  (approved /
                    decidedApprovals) *
                  100
                ).toFixed(1),
              );

        return {
          totalApprovals,
          pending,
          approved,
          rejected,
          approvalRate,
        };
      },
    );
  }
}