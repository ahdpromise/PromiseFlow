import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RlsContextService } from '../database/rls-context.service';

const DEMO_EMAIL = 'demo@promiseflow.invalid';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ORGANIZATION_ROUTES = new Set([
  '/dashboard',
  '/projects',
  '/teams',
  '/roles',
  '/reports/overview',
  '/reports/tasks-by-status',
  '/reports/tasks-by-priority',
  '/reports/project-performance',
  '/reports/approval-statistics',
]);

const PROJECT_ROUTES = new Set([
  '/tasks',
  '/workflows',
]);

const WORKFLOW_ROUTES = new Set([
  '/workflow-steps',
  '/workflow-transitions',
]);

const ACCOUNT_ROUTES = new Set([
  '/users/me',
  '/organizations',
  '/memberships',
  '/notifications',
]);

type AuthenticatedRequest = {
  method: string;
  path: string;
  query: Record<string, unknown>;
  user?: {
    userId: string;
    email: string;
  };
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly rlsContextService: RlsContextService,
  ) {
    super();
  }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const authenticated =
      await super.canActivate(context);

    if (!authenticated) {
      return false;
    }

    const request =
      context.switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const user = request.user;

    const demoUserId =
      process.env.DEMO_USER_ID?.trim();

    const demoOrganizationId =
      process.env.DEMO_ORGANIZATION_ID?.trim();

    const isDemoUser =
      user?.email?.trim().toLowerCase() === DEMO_EMAIL ||
      (
        !!demoUserId &&
        user?.userId === demoUserId
      );

    if (!isDemoUser) {
      return true;
    }

    if (
      process.env.DEMO_ENABLED !== 'true' ||
      !demoUserId ||
      !demoOrganizationId ||
      !UUID_PATTERN.test(demoUserId) ||
      !UUID_PATTERN.test(demoOrganizationId) ||
      user?.userId !== demoUserId ||
      user?.email !== DEMO_EMAIL
    ) {
      throw new ForbiddenException(
        'Demo access is disabled',
      );
    }

    if (request.method !== 'GET') {
      throw new ForbiddenException(
        'Demo mode is read-only',
      );
    }

    const path = request.path;

    const taskMatch =
      path.match(/^\/tasks\/([^/]+)$/);

    const allowedRoute =
      ACCOUNT_ROUTES.has(path) ||
      ORGANIZATION_ROUTES.has(path) ||
      PROJECT_ROUTES.has(path) ||
      WORKFLOW_ROUTES.has(path) ||
      !!taskMatch;

    if (!allowedRoute) {
      throw new ForbiddenException(
        'This action is not available in demo mode',
      );
    }

    if (
      ORGANIZATION_ROUTES.has(path) &&
      request.query.organization_id !==
        demoOrganizationId
    ) {
      throw new ForbiddenException(
        'Demo workspace access only',
      );
    }

    const allowed =
      await this.rlsContextService.run(
        demoUserId,
        async (manager) => {
          const memberships: Array<{
            organization_id: string;
            organization_slug: string;
            role_slug: string;
          }> = await manager.query(
            `
              SELECT
                m.organization_id,
                o.slug AS organization_slug,
                r.slug AS role_slug
              FROM public.memberships m
              JOIN public.organizations o
                ON o.id = m.organization_id
              JOIN public.roles r
                ON r.id = m.role_id
                AND r.organization_id = o.id
              JOIN public.users u
                ON u.id = m.user_id
              WHERE m.user_id = $1
                AND u.email = $2
                AND u.deleted_at IS NULL
                AND m.deleted_at IS NULL
                AND o.deleted_at IS NULL
                AND r.deleted_at IS NULL
            `,
            [demoUserId, DEMO_EMAIL],
          );

          if (
            memberships.length !== 1 ||
            memberships[0].organization_id !==
              demoOrganizationId ||
            memberships[0].organization_slug !==
              'promiseflow-demo' ||
            memberships[0].role_slug !==
              'demo-viewer'
          ) {
            return false;
          }

          if (PROJECT_ROUTES.has(path)) {
            const projectId =
              request.query.project_id;

            if (
              typeof projectId !== 'string' ||
              !UUID_PATTERN.test(projectId)
            ) {
              return false;
            }

            const rows = await manager.query(
              `
                SELECT EXISTS (
                  SELECT 1
                  FROM public.projects p
                  WHERE p.id = $1
                    AND p.organization_id = $2
                    AND p.deleted_at IS NULL
                ) AS allowed
              `,
              [projectId, demoOrganizationId],
            );

            return rows[0]?.allowed === true;
          }

          if (WORKFLOW_ROUTES.has(path)) {
            const workflowId =
              request.query.workflow_id;

            if (
              typeof workflowId !== 'string' ||
              !UUID_PATTERN.test(workflowId)
            ) {
              return false;
            }

            const rows = await manager.query(
              `
                SELECT EXISTS (
                  SELECT 1
                  FROM public.workflows w
                  JOIN public.projects p
                    ON p.id = w.project_id
                  WHERE w.id = $1
                    AND p.organization_id = $2
                    AND w.deleted_at IS NULL
                    AND p.deleted_at IS NULL
                ) AS allowed
              `,
              [workflowId, demoOrganizationId],
            );

            return rows[0]?.allowed === true;
          }

          if (taskMatch) {
            const taskId = taskMatch[1];

            if (!UUID_PATTERN.test(taskId)) {
              return false;
            }

            const rows = await manager.query(
              `
                SELECT EXISTS (
                  SELECT 1
                  FROM public.tasks t
                  JOIN public.projects p
                    ON p.id = t.project_id
                  WHERE t.id = $1
                    AND p.organization_id = $2
                    AND t.deleted_at IS NULL
                    AND p.deleted_at IS NULL
                ) AS allowed
              `,
              [taskId, demoOrganizationId],
            );

            return rows[0]?.allowed === true;
          }

          return true;
        },
      );

    if (!allowed) {
      throw new ForbiddenException(
        'Demo workspace access only',
      );
    }

    return true;
  }
}