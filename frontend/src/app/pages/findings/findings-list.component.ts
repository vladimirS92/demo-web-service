import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../core/api.service';
import {
  Finding, Project, STATUS_LABELS, severityTag, statusTag,
} from '../../core/models';

@Component({
  selector: 'app-findings-list',
  imports: [CommonModule, FormsModule, TableModule, TagModule, SelectModule, InputTextModule],
  template: `
    <h1 class="page-title">Findings</h1>
    <p class="page-subtitle">Review and triage security findings across all scans</p>

    <div class="ss-card mt-3">
      <div class="flex flex-wrap gap-2 mb-3">
        <p-select
          [options]="severityOptions" [(ngModel)]="severity" (onChange)="load()"
          placeholder="Severity" [showClear]="true" styleClass="w-10rem"
        />
        <p-select
          [options]="statusOptions" [(ngModel)]="status" (onChange)="load()"
          optionLabel="label" optionValue="value"
          placeholder="Status" [showClear]="true" styleClass="w-12rem"
        />
        <p-select
          [options]="projects()" [(ngModel)]="projectId" (onChange)="load()"
          optionLabel="name" optionValue="id"
          placeholder="Project" [showClear]="true" styleClass="w-14rem"
        />
        <input
          pInputText placeholder="Search title, CWE …"
          [(ngModel)]="search" (ngModelChange)="load()" class="w-full md:w-18rem"
        />
      </div>

      <p-table [value]="findings()" [paginator]="true" [rows]="15" [loading]="loading()" dataKey="id">
        <ng-template #header>
          <tr>
            <th>#</th><th>Title</th><th>Severity</th><th>Status</th>
            <th>Type</th><th>CWE</th><th>Project</th><th>Location</th>
          </tr>
        </ng-template>
        <ng-template #body let-f>
          <tr class="clickable-row" (click)="open(f)">
            <td>{{ f.id }}</td>
            <td class="font-medium">{{ f.title }}</td>
            <td><p-tag [value]="f.severity" [severity]="sevTag(f.severity)" /></td>
            <td><p-tag [value]="statusLabels[f.status]" [severity]="stTag(f.status)" /></td>
            <td>{{ f.vulnType }}</td>
            <td>{{ f.cweId }}</td>
            <td>{{ f.project?.name }}</td>
            <td class="text-sm">{{ f.filePath ? f.filePath + ':' + f.line : f.url }}</td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="8">No findings match the current filters.</td></tr>
        </ng-template>
      </p-table>
      <p class="text-sm mt-2" style="color: var(--ss-muted)">{{ total() }} finding(s) match.</p>
    </div>
  `,
})
export class FindingsListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  findings = signal<Finding[]>([]);
  projects = signal<Project[]>([]);
  total = signal(0);
  loading = signal(false);

  severity: string | null = null;
  status: string | null = null;
  projectId: number | null = null;
  search = '';

  severityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
  statusLabels: Record<string, string> = STATUS_LABELS;
  sevTag = severityTag;
  stTag = statusTag;

  ngOnInit() {
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('projectId')) this.projectId = Number(qp.get('projectId'));
    if (qp.get('severity')) this.severity = qp.get('severity');
    if (qp.get('status')) this.status = qp.get('status');
    this.api.listProjects().subscribe((res) => this.projects.set(res.items));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.api
      .listFindings({
        severity: this.severity ?? undefined,
        status: this.status ?? undefined,
        projectId: this.projectId ?? undefined,
        search: this.search || undefined,
      })
      .subscribe((res) => {
        this.findings.set(res.items);
        this.total.set(res.total);
        this.loading.set(false);
      });
  }

  open(f: Finding) { this.router.navigate(['/findings', f.id]); }
}
