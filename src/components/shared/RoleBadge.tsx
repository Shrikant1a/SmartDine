import { Badge } from "@/components/ui/badge";
import type { StaffRole } from "@/constants/roles";

const ROLE_STYLES: Record<StaffRole, string> = {
  owner: "bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300",
  manager: "bg-blue-500/15 text-blue-800 border-blue-500/30 dark:text-blue-300",
  kitchen: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300",
  waiter: "bg-purple-500/15 text-purple-800 border-purple-500/30 dark:text-purple-300",
};

export function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <Badge variant="outline" className={`capitalize font-medium ${ROLE_STYLES[role]}`}>
      {role}
    </Badge>
  );
}
