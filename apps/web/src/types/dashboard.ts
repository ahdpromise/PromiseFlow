export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Project = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Task = {
  id: string;
  project_id: string;
  workflow_step_id: string | null;
  assigned_to_user_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Team = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Approval = {
  id: string;
  task_id: string;
  approver_user_id: string;
  status: string;
  comment: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};