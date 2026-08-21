import { Module } from '@nestjs/common';
import { FindingsModule } from '../findings/findings.module';
import { ProjectsModule } from '../projects/projects.module';
import { ScansModule } from '../scans/scans.module';
import { StatsModule } from '../stats/stats.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [ProjectsModule, ScansModule, FindingsModule, StatsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
