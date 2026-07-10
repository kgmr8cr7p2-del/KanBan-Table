import { RoleName, type Task } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth";

export function isAdmin(user: CurrentUser) {
  return user.role.name === RoleName.ADMIN;
}

export function isManager(user: CurrentUser) {
  return user.role.name === RoleName.MANAGER;
}

export function canManageColumns(user: CurrentUser) {
  return isAdmin(user);
}

export function canCreateTask(user: CurrentUser) {
  return isAdmin(user) || isManager(user);
}

export function canEditTask(user: CurrentUser, task?: Pick<Task, "assigneeId"> | null) {
  if (isAdmin(user) || isManager(user)) return true;
  return Boolean(task?.assigneeId && task.assigneeId === user.id);
}

export function canDeleteTask(user: CurrentUser) {
  return isAdmin(user);
}

export function canDeleteComment(user: CurrentUser, authorId: string) {
  return isAdmin(user) || user.id === authorId;
}
