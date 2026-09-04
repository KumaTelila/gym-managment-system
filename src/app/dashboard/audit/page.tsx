"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, RefreshCw, Eye, Filter, UserCheck, KeyRound, Wrench } from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  detailsJson: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    username: string;
    fullName: string;
    role: string;
  } | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [viewLog, setViewLog] = useState<AuditLogItem | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const url =
        selectedAction === "ALL"
          ? "/api/audit"
          : `/api/audit?action=${encodeURIComponent(selectedAction)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalCount(data.totalCount || 0);
        setAvailableActions(data.availableActions || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedAction]);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "STAFF_LOGIN":
        return "secondary";
      case "SESSION_STARTED":
        return "info";
      case "SESSION_COMPLETED":
        return "success";
      case "CARD_REPLACED":
        return "warning";
      case "CONFIG_UPDATED":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            System Audit & Activity Logs
          </h1>
          <p className="text-xs text-slate-500">
            Immutable log of all operational events, check-ins, card reissues, and configuration changes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadLogs}
          className="h-8 text-xs border-slate-300"
        >
          <RefreshCw className="h-3 w-3 mr-1.5" />
          Refresh Logs
        </Button>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Filter by Event:</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedAction("ALL")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  selectedAction === "ALL"
                    ? "bg-[#1e3a8a] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                All Events ({totalCount})
              </button>
              {availableActions.map((act) => (
                <button
                  key={act}
                  onClick={() => setSelectedAction(act)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    selectedAction === act
                      ? "bg-[#1e3a8a] text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Event Trail</CardTitle>
          <CardDescription className="text-xs">
            Showing latest {logs.length} system audit entries with actor attribution
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Actor / Staff</TableHead>
                <TableHead>Details Preview</TableHead>
                <TableHead className="text-right">Inspect</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    {loading ? "Loading audit trail..." : "No events found."}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  let parsedDetails = null;
                  try {
                    if (log.detailsJson) parsedDetails = JSON.parse(log.detailsJson);
                  } catch {
                    parsedDetails = log.detailsJson;
                  }

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getActionBadgeVariant(log.action)}
                          className="font-mono text-[10px] uppercase"
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-semibold text-slate-800">{log.entityType}</span>
                        <span className="font-mono text-[10px] text-slate-400 block truncate max-w-[120px]">
                          {log.entityId}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.user ? (
                          <div>
                            <span className="font-medium text-slate-900">{log.user.fullName}</span>
                            <span className="text-[10px] text-slate-400 block">
                              @{log.user.username} ({log.user.role})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">SYSTEM</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-xs truncate font-mono text-[11px]">
                        {log.detailsJson || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewLog(log)}
                          className="h-7 text-xs px-2 text-slate-600 hover:text-slate-900"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inspect Detail Modal */}
      <Dialog open={!!viewLog} onOpenChange={() => setViewLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Audit Event Details</DialogTitle>
            <DialogDescription>
              Inspection of recorded snapshot #{viewLog?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {viewLog && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Action</span>
                  <Badge variant={getActionBadgeVariant(viewLog.action)} className="mt-0.5">
                    {viewLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Recorded At</span>
                  <span className="font-mono text-slate-800">
                    {new Date(viewLog.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Entity Type</span>
                  <span className="font-semibold text-slate-800">{viewLog.entityType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Entity ID</span>
                  <span className="font-mono text-slate-700 text-[11px] break-all">{viewLog.entityId}</span>
                </div>
              </div>

              <div className="border-b border-slate-100 pb-2">
                <span className="text-slate-400 block text-[10px]">Actor / Staff User</span>
                <span className="font-medium text-slate-900">
                  {viewLog.user ? `${viewLog.user.fullName} (@${viewLog.user.username})` : "SYSTEM / AUTO"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] mb-1">Payload JSON</span>
                <pre className="p-2.5 rounded bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-48">
                  {viewLog.detailsJson
                    ? JSON.stringify(JSON.parse(viewLog.detailsJson), null, 2)
                    : "{}"}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewLog(null)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
