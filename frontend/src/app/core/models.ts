// Shared API contract types (mirror the NestJS/Prisma models)

export type ScanType = 'SAST' | 'DAST';
export type ScanStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type FindingStatus = 'OPEN' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK' | 'FIXED';

export interface User { id: number; username: string; name: string; role: string; }
export interface LoginResponse { accessToken: string; user: User; }

export interface Project {
  id: number; name: string; description: string; repoUrl: string;
  defaultBranch: string; stack: string; owner: string; createdAt: string;
  _count?: { scans: number; findings: number };
}

export interface Scan {
  id: number; projectId: number; type: ScanType; status: ScanStatus;
  startedAt: string; finishedAt?: string; durationSec?: number;
  project?: { id: number; name: string };
  findingCount: number;
  severityCounts: Record<Severity, number>;
}

export interface StatusChange {
  id: number; oldStatus: FindingStatus; newStatus: FindingStatus;
  comment: string; changedBy: string; changedAt: string;
}

export interface Finding {
  id: number; scanId: number; projectId: number;
  title: string; description: string; severity: Severity; status: FindingStatus;
  vulnType: string; cweId: string; filePath?: string; line?: number; url?: string;
  recommendation: string; createdAt: string;
  project?: { id: number; name: string };
  scan?: { id: number; type: ScanType; startedAt: string };
  statusHistory?: StatusChange[];
}

export interface Paged<T> { items: T[]; total: number; }

export interface StatsOverview {
  kpis: {
    totalOpenFindings: number;
    criticalOpenFindings: number;
    scansThisMonth: number;
    meanFindingsPerScan: number;
  };
  bySeverity: { severity: Severity; count: number }[];
  byStatus: { status: FindingStatus; count: number }[];
  overTime: { date: string; count: number }[];
  topProjects: { name: string; count: number }[];
}

export interface ChatResponse { reply: string; actions: string[]; demoMode: boolean; }

export const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: '#b91c1c', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#2563eb', INFO: '#64748b',
};
export const STATUS_LABELS: Record<FindingStatus, string> = {
  OPEN: 'Open', CONFIRMED: 'Confirmed', FALSE_POSITIVE: 'False positive',
  ACCEPTED_RISK: 'Accepted risk', FIXED: 'Fixed',
};

export function severityTag(s: Severity): 'danger' | 'warn' | 'info' | 'secondary' {
  switch (s) {
    case 'CRITICAL': return 'danger';
    case 'HIGH': return 'warn';
    case 'MEDIUM': return 'warn';
    case 'LOW': return 'info';
    default: return 'secondary';
  }
}
export function statusTag(s: FindingStatus): 'danger' | 'success' | 'info' | 'secondary' | 'warn' {
  switch (s) {
    case 'OPEN': return 'danger';
    case 'CONFIRMED': return 'warn';
    case 'FIXED': return 'success';
    case 'FALSE_POSITIVE': return 'secondary';
    default: return 'info';
  }
}
export function scanStatusTag(s: ScanStatus): 'success' | 'info' | 'warn' | 'danger' {
  switch (s) {
    case 'COMPLETED': return 'success';
    case 'RUNNING': return 'info';
    case 'QUEUED': return 'warn';
    default: return 'danger';
  }
}
