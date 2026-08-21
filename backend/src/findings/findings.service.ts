import { Injectable, NotFoundException } from '@nestjs/common';
import { FindingStatus, Prisma, Severity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FindingFilters {
  projectId?: number;
  scanId?: number;
  severity?: Severity;
  status?: FindingStatus;
  vulnType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class FindingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: FindingFilters) {
    const where: Prisma.FindingWhereInput = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.scanId) where.scanId = filters.scanId;
    if (filters.severity) where.severity = filters.severity;
    if (filters.status) where.status = filters.status;
    if (filters.vulnType) where.vulnType = { contains: filters.vulnType, mode: 'insensitive' };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { cweId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 500;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.finding.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.finding.count({ where }),
    ]);
    return { items, total };
  }

  async get(id: number) {
    const finding = await this.prisma.finding.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        scan: { select: { id: true, type: true, startedAt: true } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });
    if (!finding) throw new NotFoundException(`Finding #${id} not found`);
    return finding;
  }

  /** Change a finding's review status and record who did it in the audit trail. */
  async updateStatus(id: number, newStatus: FindingStatus, comment: string, changedBy: string) {
    const finding = await this.prisma.finding.findUnique({ where: { id } });
    if (!finding) throw new NotFoundException(`Finding #${id} not found`);

    const [updated] = await this.prisma.$transaction([
      this.prisma.finding.update({ where: { id }, data: { status: newStatus } }),
      this.prisma.findingStatusChange.create({
        data: {
          findingId: id,
          oldStatus: finding.status,
          newStatus,
          comment: comment || '',
          changedBy,
        },
      }),
    ]);
    return this.get(updated.id);
  }
}
