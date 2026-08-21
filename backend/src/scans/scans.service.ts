import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScanStatus, ScanType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { generateFindings } from './finding-generator';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Create a scan in QUEUED state and start the simulated pipeline. */
  async start(projectId: number, type: ScanType) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project #${projectId} not found`);

    const scan = await this.prisma.scan.create({
      data: { projectId, type, status: ScanStatus.QUEUED },
    });

    // Fire-and-forget: the simulation runs in the background while the
    // frontend polls GET /scans/:id every 2 seconds for status updates.
    this.simulate(scan.id, projectId, type).catch((err) =>
      this.logger.error(`Scan #${scan.id} simulation failed`, err),
    );
    return scan;
  }

  /** Simulated pipeline: QUEUED -> (3s) -> RUNNING -> (5s) -> COMPLETED + findings. */
  private async simulate(scanId: number, projectId: number, type: ScanType) {
    await sleep(3000);
    await this.prisma.scan.update({
      where: { id: scanId },
      data: { status: ScanStatus.RUNNING },
    });

    await sleep(4000 + Math.floor(Math.random() * 3000));

    const count = 5 + Math.floor(Math.random() * 9); // 5–13 findings
    const generated = generateFindings(type, count);
    const finishedAt = new Date();
    const scan = await this.prisma.scan.findUnique({ where: { id: scanId } });
    const durationSec = scan
      ? Math.round((finishedAt.getTime() - scan.startedAt.getTime()) / 1000)
      : 0;

    await this.prisma.$transaction([
      this.prisma.finding.createMany({
        data: generated.map((f) => ({ ...f, scanId, projectId })),
      }),
      this.prisma.scan.update({
        where: { id: scanId },
        data: { status: ScanStatus.COMPLETED, finishedAt, durationSec },
      }),
    ]);
    this.logger.log(`Scan #${scanId} completed with ${count} findings`);
  }

  async list(projectId?: number) {
    const scans = await this.prisma.scan.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { startedAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        findings: { select: { severity: true } },
      },
    });
    return scans.map((s) => this.withCounts(s));
  }

  async get(id: number) {
    const scan = await this.prisma.scan.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        findings: { select: { severity: true } },
      },
    });
    if (!scan) throw new NotFoundException(`Scan #${id} not found`);
    return this.withCounts(scan);
  }

  private withCounts(scan: any) {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 } as Record<string, number>;
    for (const f of scan.findings) counts[f.severity]++;
    const { findings, ...rest } = scan;
    return { ...rest, findingCount: findings.length, severityCounts: counts };
  }
}
