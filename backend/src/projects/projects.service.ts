import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './projects.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search = '', page = 1, pageSize = 200) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { stack: { contains: search, mode: 'insensitive' as const } },
            { owner: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { scans: true, findings: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total };
  }

  async get(id: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { _count: { select: { scans: true, findings: true } } },
    });
    if (!project) throw new NotFoundException(`Project #${id} not found`);
    return project;
  }

  async findByName(name: string) {
    return this.prisma.project.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
  }

  async create(dto: CreateProjectDto) {
    const exists = await this.findByName(dto.name);
    if (exists) throw new ConflictException(`A project named "${dto.name}" already exists`);
    return this.prisma.project.create({ data: dto });
  }

  async update(id: number, dto: UpdateProjectDto) {
    await this.get(id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.get(id);
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }
}
