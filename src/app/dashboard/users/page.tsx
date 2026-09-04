"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, ShieldCheck, CheckCircle2, Edit2, Power } from "lucide-react";

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RECEPTIONIST");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, fullName, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setIsDialogOpen(false);
      setUsername("");
      setFullName("");
      setPassword("");
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error creating user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editingUser.fullName,
          role: editingUser.role,
          isActive: editingUser.isActive,
          password: editPassword ? editPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update staff account");

      setEditingUser(null);
      setEditPassword("");
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating staff account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Staff & Access Control
          </h1>
          <p className="text-xs text-slate-500">
            Manage front-desk receptionists, managers, and administrative role permissions.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#1e3a8a] text-white hover:bg-[#1e40af] h-8 text-xs font-semibold shadow-2xs"
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Add Staff Account
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Authorized Staff Accounts</CardTitle>
          <CardDescription className="text-xs">
            System accounts authorized to perform check-ins, sales, and shift audits
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs font-bold text-slate-900">
                    {u.username}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {u.fullName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        u.role === "ADMIN"
                          ? "default"
                          : u.role === "FINANCE_OWNER"
                          ? "info"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {u.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "success" : "destructive"} className="text-[10px]">
                      {u.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingUser(u);
                        setEditPassword("");
                      }}
                      className="h-7 text-xs px-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <Edit2 className="h-3 w-3 mr-1 text-slate-500" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>
              Create credentials for front-desk or management staff.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Username *</label>
              <Input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. samson"
                className="h-8 text-xs bg-slate-50"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Samson Kassa"
                className="h-8 text-xs bg-slate-50"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Password *</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-8 text-xs bg-slate-50"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
              >
                <option value="RECEPTIONIST">Receptionist (Front desk & POS)</option>
                <option value="FINANCE_OWNER">Finance Manager / Owner</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-8 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
              >
                {submitting ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Account</DialogTitle>
            <DialogDescription>
              Update permissions, role, or reset password for @{editingUser?.username}.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <Input
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">System Role *</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                >
                  <option value="RECEPTIONIST">Receptionist (Front desk & POS)</option>
                  <option value="FINANCE_OWNER">Finance Manager / Owner</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Account Status *</label>
                <select
                  value={editingUser.isActive ? "ACTIVE" : "DISABLED"}
                  onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.value === "ACTIVE" })}
                  className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs"
                >
                  <option value="ACTIVE">Active (Access Granted)</option>
                  <option value="DISABLED">Disabled (Access Blocked)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Reset Password</label>
                <Input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-8 text-xs bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
                >
                  {submitting ? "Saving..." : "Save Staff Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
