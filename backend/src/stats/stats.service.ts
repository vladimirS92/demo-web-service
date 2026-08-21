import { Injectable } from '@nestjs/common';
import { FindingStatus, ScanStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** All dashboard numbers, computed live from the database. */
  async overview() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalFindings,
      openFindings,
      criticalOpen,
      scansThisMonth,
      completedScans,
      findings,
      projects,
    ] = await this.prisma.$transaction([
      this.prisma.finding.count(),
      this.prisma.finding.count({ where: { status: FindingStatus.OPEN } }),
      this.prisma.finding.count({
        where: { status: FindingStatus.OPEN, severity: 'CRITICAL' },
      }),
      this.prisma.scan.count({ where: { startedAt: { gte: startOfMonth } } }),
      this.prisma.scan.count({ where: { status: ScanStatus.COMPLETED } }),
      this.prisma.finding.findMany({ select: { createdAt: true } }),
      this.prisma.project.findMany({
        select: { name: true, _count: { select: { findings: true } } },
      }),
    ]);

    const bySeverityRaw = await this.prisma.finding.groupBy({
      by: ['severity'],
      _count: true,
    });
    const byStatusRaw = await this.prisma.finding.groupBy({
      by: ['status'],
      _count: true,
    });

    // Findings created per day, last 30 days
    const days: { date: string; count: number }[] = [];
    const byDay = new Map<string, number>();
    for (const f of findings) {
      const key = f.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: byDay.get(key) || 0 });
    }

    const topProjects = projects
      .map((p) => ({ name: p.name, count: p._count.findings }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      kpis: {
        totalOpenFindings: openFindings,
        criticalOpenFindings: criticalOpen,
        scansThisMonth,
        meanFindingsPerScan:
          completedScans > 0 ? Math.round((totalFindings / completedScans) * 10) / 10 : 0,
      },
      bySeverity: bySeverityRaw.map((r) => ({ severity: r.severity, count: r._count })),
      byStatus: byStatusRaw.map((r) => ({ status: r.status, count: r._count })),
      overTime: days,
      topProjects,
    };
  }
}
