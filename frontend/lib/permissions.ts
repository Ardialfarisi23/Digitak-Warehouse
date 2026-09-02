import { UserRole } from "@/lib/navigation";

export type PersonnelAction = "view" | "create" | "edit" | "delete";

export const PERSONNEL_PERMISSIONS: Record<
  PersonnelAction,
  UserRole[]
> = {
  view: ["admin", "supervisor", "staff"],
  create: ["admin", "supervisor"],
  edit: ["admin", "supervisor"],
  delete: ["admin"],
};

export function canPerformPersonnelAction(
  role: UserRole | undefined | null,
  action: PersonnelAction
): boolean {
  if (!role) return false;
  return PERSONNEL_PERMISSIONS[action].includes(role);
}