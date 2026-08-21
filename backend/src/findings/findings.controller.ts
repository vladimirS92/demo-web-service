import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FindingStatus, Severity } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FindingsService } from './findings.service';

export class UpdateFindingStatusDto {
  @IsEnum(FindingStatus)
  status!: FindingStatus; // OPEN | CONFIRMED | FALSE_POSITIVE | ACCEPTED_RISK | FIXED

  @IsString() @IsOptional() @MaxLength(500)
  comment?: string;
}

@ApiTags('findings')
@ApiBearerAuth()
@Controller('findings')
export class FindingsController {
  constructor(private readonly findings: FindingsService) {}

  @Get()
  list(
    @Query('projectId') projectId?: string,
    @Query('scanId') scanId?: string,
    @Query('severity') severity?: Severity,
    @Query('status') status?: FindingStatus,
    @Query('vulnType') vulnType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.findings.list({
      projectId: projectId ? Number(projectId) : undefined,
      scanId: scanId ? Number(scanId) : undefined,
      severity,
      status,
      vulnType,
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 500,
    });
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.findings.get(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFindingStatusDto,
    @Req() req: any,
  ) {
    const user = req.user?.username || 'unknown';
    return this.findings.updateStatus(id, dto.status, dto.comment || '', user);
  }
}
