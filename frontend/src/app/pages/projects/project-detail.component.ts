import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../core/api.service';
import { Project, Scan, scanStatusTag } from '../../core/models';

@Component({
  selector: 'app-project-detail',
  imports: [CommonModule, RouterLink, ButtonModule, TableModule, TagModule],
  template: `
    @if (project(); as p) {
      <div class="flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <h1 class="page-title">{{ p.name }}</h1>
          <p class="page-subtitle">{{ p.description || 'No description' }}</p>
        </div>
        <div class="flex gap-2">
          <p-button label="Start SAST scan" icon="pi pi-code" [loading]="starting()" (onClick)="start('SAST')" />
          <p-button label="Start DAST scan" icon="pi pi-globe" severity="secondary" [loading]="starting()" (onClick)="start('DAST')" />
        </div>
      </div>

      <div class="grid mt-2">
        <div class="col-12 md:col-4">
          <div class="ss-card">
            <h3 class="mt-0 text-base">Details</h3>
            <div class="detail-row"><span>Repository</span><span class="break-all">{{ p.repoUrl }}</span></div>
            <div class="detail-row"><span>Default branch</span><span>{{ p.defaultBranch }}</span></div>
            <div class="detail-row"><span>Stack</span><span>{{ p.stack }}</span></div>
            <div class="detail-row"><span>Owner</span><span>{{ p.owner }}</span></div>
            <div class="detail-row"><span>Created</span><span>{{ p.createdAt | date: 'medium' }}</span></div>
            <a class="block mt-3" [routerLink]="['/findings']" [queryParams]="{ projectId: p.id }">
              View all findings for this project →
            </a>
          </div>
        </div>
        <div class="col-12 md:col-8">
          <div class="ss-card">
            <h3 class="mt-0 text-base">Scan history</h3>
            <p-table [value]="scans()" dataKey="id">
              <ng-template #header>
                <tr><th>#</th><th>Type</th><th>Status</th><th>Started</th><th>Duration</th><th>Findings</th><th>Crit / High</th></tr>
              </ng-template>
              <ng-template #body let-s>
                <tr>
                  <td>{{ s.id }}</td>
                  <td>{{ s.type }}</td>
                  <td><p-tag [value]="s.status" [severity]="statusTag(s.status)" /></td>
                  <td>{{ s.startedAt | date: 'MMM d, HH:mm:ss' }}</td>
                  <td>{{ s.durationSec != null ? s.durationSec + 's' : '—' }}</td>
                  <td>{{ s.findingCount }}</td>
                  <td>{{ s.severityCounts.CRITICAL }} / {{ s.severityCounts.HIGH }}</td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr><td colspan="7">No scans yet — start one above. Progress updates automatically.</td></tr>
              </ng-template>
            </p-table>
            @if (hasActiveScan()) {
              <p class="text-sm mt-2" style="color: var(--ss-muted)">
                <i class="pi pi-spin pi-spinner"></i> A scan is in progress — refreshing every 2 seconds …
              </p>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .detail-row { display: flex; justify-content: space-between; gap: 1rem; padding: .4rem 0; border-bottom: 1px solid var(--ss-border); font-size: .875rem; }
    .detail-row span:first-child { color: var(--ss-muted); flex-shrink: 0; }
    .detail-row span:last-child { text-align: right; }
  `],
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  project = signal<Project | null>(null);
  scans = signal<Scan[]>([]);
  starting = signal(false);
  hasActiveScan = signal(false);
  statusTag = scanStatusTag;

  private id = 0;
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.id) { this.router.navigate(['/projects']); return; }
    this.api.getProject(this.id).subscribe({
      next: (p) => this.project.set(p),
      error: () => this.router.navigate(['/projects']),
    });
    this.loadScans();
  }

  ngOnDestroy() { this.stopPolling(); }

  start(type: 'SAST' | 'DAST') {
    this.starting.set(true);
    this.api.startScan(this.id, type).subscribe({
      next: () => { this.starting.set(false); this.loadScans(); },
      error: () => this.starting.set(false),
    });
  }

  loadScans() {
    this.api.listScans(this.id).subscribe((scans) => {
      this.scans.set(scans);
      const active = scans.some((s) => s.status === 'QUEUED' || s.status === 'RUNNING');
      this.hasActiveScan.set(active);
      if (active) this.startPolling();
      else this.stopPolling();
    });
  }

  private startPolling() {
    if (this.timer) return;
    this.timer = setInterval(() => this.loadScans(), 2000);
  }
  private stopPolling() {
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
  }
}
