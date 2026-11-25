"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { STAFF_ROLES, type StaffRole } from "@/constants/roles";
import type { AuditLog, StaffMember } from "@/types/database";
import { toast } from "sonner";

export function StaffManager({
  initialStaff,
  auditLogs,
  isOwner,
  currentStaffId,
}: {
  initialStaff: StaffMember[];
  auditLogs: AuditLog[];
  isOwner: boolean;
  currentStaffId: string;
}) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("waiter");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, role, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add staff member");
        return;
      }
      setStaff((prev) => [...prev, data.staff]);
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      toast.success(`Added ${data.staff.name} (${data.staff.role})`);
    } finally {
      setCreating(false);
    }
  }

  async function updateMember(
    member: StaffMember,
    patch: { role?: StaffRole; isActive?: boolean },
  ) {
    const res = await fetch(`/api/admin/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not update staff member");
      return;
    }
    setStaff((prev) => prev.map((s) => (s.id === member.id ? data.staff : s)));
    toast.success(`Updated ${member.name}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? "Create staff accounts, assign roles, activate/deactivate access, and inspect activity logs."
            : "View restaurant staff directory. Only the Owner can add or modify staff accounts."}
        </p>
      </div>

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Staff Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="stName">Full Name</Label>
                <Input
                  id="stName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stEmail">Email</Label>
                <Input
                  id="stEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stPhone">Phone (optional)</Label>
                <Input
                  id="stPhone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stRole">Role</Label>
                <select
                  id="stRole"
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffRole)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stPass">Temporary Password (min 10 chars)</Label>
                <Input
                  id="stPass"
                  type="password"
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Create Staff
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff Accounts ({staff.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {staff.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{member.name}</span>
                  <RoleBadge role={member.role} />
                  <Badge variant={member.is_active ? "default" : "secondary"}>
                    {member.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {member.email}
                  {member.phone ? ` • ${member.phone}` : ""}
                </p>
              </div>

              {isOwner ? (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    disabled={member.id === currentStaffId}
                    onChange={(e) =>
                      void updateMember(member, {
                        role: e.target.value as StaffRole,
                      })
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={member.id === currentStaffId}
                    onClick={() =>
                      void updateMember(member, { isActive: !member.is_active })
                    }
                  >
                    {member.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Staff &amp; System Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {auditLogs.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No audit events recorded yet.
              </p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold">{log.action}</span>
                    <span className="ml-2 text-muted-foreground">
                      ({log.entity_type})
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {log.actor_role ?? "system"} •{" "}
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
