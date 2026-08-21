import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../core/api.service';
import { Scan, scanStatusTag } from '../../core/models';

@Component({
  selector: 'app-scans-list',
  imports: [CommonModule, RouterLink, TableModule, TagModule],
  template: `
    <h1 class="page-title">Scans</h1>
    <p class="page-subtitle">All SAST and DAST scans across projects</p>

    <div class="ss-card mt-3">
      <p-table [value]="scans()" [paginator]="true" [rows]="15" dataKey="id">
        <ng-template #header>
          <tr>
            <th>#</th><th>Project</th><th>Type</th><th>Status</th>
            <th>Started</th><th>Duration</th><th>Findings</th><th>C / H / M / L / I</th>
          </tr>
        </ng-template>
        <ng-template #body let-s>
          <tr>
            <td>{{ s.id }}</td>
            <td><a [routerLink]="['/projects', s.project?.id]">{{ s.project?.name }}</a></td>
            <td>{{ s.type }}</td>
            <td><p-tag [value]="s.status" [severity]="statusTag(s.status)" /></td>
            <td>{{ s.startedAt | date: 'MMM d, HH:mm' }}</td>
            <td>{{ s.durationSec != null ? s.durationSec + 's' : '—' }}</td>
            <td>{{ s.findingCount }}</td>
            <td class="text-sm">
              {{ s.severityCounts.CRITICAL }} / {{ s.severityCounts.HIGH }} / {{ s.severityCounts.MEDIUM }} /
              {{ s.severityCounts.LOW }} / {{ s.severityCounts.INFO }}
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="8">No scans yet. Start one from a project detail page.</td></tr>
        </ng-template>
      </p-table>
      @if (hasActive()) {
        <p class="text-sm mt-2" style="color: var(--ss-muted)">
          <i class="pi pi-spin pi-spinner"></i> Scans in progress — refreshing every 2 seconds …
        </p>
      }
    </div>
  `,
})
export class ScansListComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  scans = signal<Scan[]>([]);
  hasActive = signal(false);
  statusTag = scanStatusTag;
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() { this.load(); }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  load() {
    this.api.listScans().subscribe((scans) => {
      this.scans.set(scans);
      const active = scans.some((s) => s.status === 'QUEUED' || s.status === 'RUNNING');
      this.hasActive.set(active);
      if (active && !this.timer) this.timer = setInterval(() => this.load(), 2000);
      if (!active && this.timer) { clearInterval(this.timer); this.timer = undefined; }
    });
  }
}
