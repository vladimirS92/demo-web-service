import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ScanType } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { ScansService } from './scans.service';

export class StartScanDto {
  @IsEnum(ScanType)
  type!: ScanType; // SAST | DAST
}

@ApiTags('scans')
@ApiBearerAuth()
@Controller()
export class ScansController {
  constructor(private readonly scans: ScansService) {}

  /** Start a simulated SAST or DAST scan on a project. */
  @Post('projects/:projectId/scans')
  start(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() dto: StartScanDto,
  ) {
    return this.scans.start(projectId, dto.type);
  }

  @Get('scans')
  list(@Query('projectId') projectId?: string) {
    return this.scans.list(projectId ? Number(projectId) : undefined);
  }

  @Get('scans/:id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.scans.get(id);
  }
}
