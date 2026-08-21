import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { ApiService } from '../../core/api.service';
import { SEVERITY_COLORS, SEVERITY_ORDER, STATUS_LABELS, StatsOverview } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ChartModule],
  template: `
    <h1 class="page-title">Dashboard</h1>
    <p class="page-subtitle">Security posture across all registered projects</p>

    @if (stats(); as s) {
      <div class="grid mt-2">
        <div class="col-12 md:col-3">
          <div class="ss-card kpi">
            <span class="kpi-label">Open findings</span>
            <span class="kpi-value">{{ s.kpis.totalOpenFindings }}</span>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="ss-card kpi">
            <span class="kpi-label">Critical open</span>
            <span class="kpi-value critical">{{ s.kpis.criticalOpenFindings }}</span>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="ss-card kpi">
            <span class="kpi-label">Scans this month</span>
            <span class="kpi-value">{{ s.kpis.scansThisMonth }}</span>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="ss-card kpi">
            <span class="kpi-label">Mean findings / scan</span>
            <span class="kpi-value">{{ s.kpis.meanFindingsPerScan }}</span>
          </div>
        </div>

        <div class="col-12 md:col-4">
          <div class="ss-card">
            <h3 class="chart-title">Findings by severity</h3>
            <p-chart type="doughnut" [data]="severityChart" [options]="doughnutOpts" height="260px" />
          </div>
        </div>
        <div class="col-12 md:col-8">
          <div class="ss-card">
            <h3 class="chart-title">Findings over time (30 days)</h3>
            <p-chart type="line" [data]="timeChart" [options]="lineOpts" height="260px" />
          </div>
        </div>
        <div class="col-12 md:col-6">
          <div class="ss-card">
            <h3 class="chart-title">Findings by status</h3>
            <p-chart type="bar" [data]="statusChart" [options]="barOpts" height="260px" />
          </div>
        </div>
        <div class="col-12 md:col-6">
          <div class="ss-card">
            <h3 class="chart-title">Top vulnerable projects</h3>
            <p-chart type="bar" [data]="projectChart" [options]="hbarOpts" height="260px" />
          </div>
        </div>
      </div>
    } @else {
      <p class="mt-3">Loading dashboard …</p>
    }
  `,
  styles: [`
    .kpi { display: flex; flex-direction: column; gap: .3rem; }
    .kpi-label { color: var(--ss-muted); font-size: .82rem; text-transform: uppercase; letter-spacing: .5px; }
    .kpi-value { font-size: 1.9rem; font-weight: 700; }
    .kpi-value.critical { color: #b91c1c; }
    .chart-title { margin: 0 0 .75rem; font-size: .95rem; }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);

  stats = signal<StatsOverview | null>(null);
  severityChart: any;
  timeChart: any;
  statusChart: any;
  projectChart: any;

  doughnutOpts: any = { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false };
  lineOpts: any = { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } };
  barOpts: any = { plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } };
  hbarOpts: any = { indexAxis: 'y', plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } };

  ngOnInit() {
    this.api.statsOverview().subscribe((s) => {
      this.stats.set(s);

      const sevCounts = SEVERITY_ORDER.map(
        (sev) => s.bySeverity.find((x) => x.severity === sev)?.count || 0,
      );
      this.severityChart = {
        labels: SEVERITY_ORDER,
        datasets: [{ data: sevCounts, backgroundColor: SEVERITY_ORDER.map((x) => SEVERITY_COLORS[x]) }],
      };

      this.timeChart = {
        labels: s.overTime.map((d) => d.date.slice(5)),
        datasets: [{
          data: s.overTime.map((d) => d.count),
          borderColor: '#1d4ed8', backgroundColor: 'rgba(29,78,216,.12)',
          fill: true, tension: 0.3, pointRadius: 2,
        }],
      };

      this.statusChart = {
        labels: s.byStatus.map((x) => STATUS_LABELS[x.status]),
        datasets: [{ data: s.byStatus.map((x) => x.count), backgroundColor: '#3b82f6', borderRadius: 4 }],
      };

      this.projectChart = {
        labels: s.topProjects.map((p) => p.name),
        datasets: [{ data: s.topProjects.map((p) => p.count), backgroundColor: '#0ea5e9', borderRadius: 4 }],
      };
    });
  }
}
