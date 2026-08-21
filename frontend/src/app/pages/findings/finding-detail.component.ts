import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ApiService } from '../../core/api.service';
import { Finding, STATUS_LABELS, severityTag, statusTag } from '../../core/models';

@Component({
  selector: 'app-finding-detail',
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, TagModule, SelectModule, TextareaModule],
  template: `
    @if (finding(); as f) {
      <a routerLink="/findings" class="text-sm">← Back to findings</a>
      <div class="flex justify-content-between align-items-start flex-wrap gap-3 mt-2">
        <div>
          <h1 class="page-title">#{{ f.id }} — {{ f.title }}</h1>
          <p class="page-subtitle">
            {{ f.vulnType }} · {{ f.cweId }} · Project
            <a [routerLink]="['/projects', f.project?.id]">{{ f.project?.name }}</a>
            · Scan #{{ f.scan?.id }} ({{ f.scan?.type }})
          </p>
        </div>
        <div class="flex gap-2 align-items-center">
          <p-tag [value]="f.severity" [severity]="sevTag(f.severity)" />
          <p-tag [value]="statusLabels[f.status]" [severity]="stTag(f.status)" />
        </div>
      </div>

      <div class="grid mt-2">
        <div class="col-12 md:col-8">
          <div class="ss-card">
            <h3 class="mt-0 text-base">Description</h3>
            <p>{{ f.description }}</p>
            <h3 class="text-base">Location</h3>
            <p><code>{{ f.filePath ? f.filePath + ':' + f.line : f.url }}</code></p>
            <h3 class="text-base">Recommendation</h3>
            <p>{{ f.recommendation }}</p>
            <p class="text-sm" style="color: var(--ss-muted)">Detected {{ f.createdAt | date: 'medium' }}</p>
          </div>

          <div class="ss-card mt-3">
            <h3 class="mt-0 text-base">Audit trail</h3>
            @if (f.statusHistory?.length) {
              @for (h of f.statusHistory; track h.id) {
                <div class="history-item">
                  <div>
                    <strong>{{ h.changedBy }}</strong> changed status
                    <p-tag [value]="statusLabels[h.oldStatus]" severity="secondary" /> →
                    <p-tag [value]="statusLabels[h.newStatus]" [severity]="stTag(h.newStatus)" />
                  </div>
                  @if (h.comment) { <div class="text-sm mt-1">“{{ h.comment }}”</div> }
                  <div class="text-sm" style="color: var(--ss-muted)">{{ h.changedAt | date: 'medium' }}</div>
                </div>
              }
            } @else {
              <p class="text-sm" style="color: var(--ss-muted)">No status changes yet.</p>
            }
          </div>
        </div>

        <div class="col-12 md:col-4">
          <div class="ss-card">
            <h3 class="mt-0 text-base">Change status</h3>
            <p-select
              [options]="statusOptions" [(ngModel)]="newStatus"
              optionLabel="label" optionValue="value" styleClass="w-full"
            />
            <textarea
              pTextarea class="w-full mt-2" rows="3" [(ngModel)]="comment"
              placeholder="Optional comment for the audit trail"></textarea>
            <p-button
              label="Save status" icon="pi pi-check" styleClass="w-full mt-2"
              [loading]="saving()" (onClick)="save()"
            />
            @if (saved()) { <p class="text-sm mt-2" style="color: #15803d">Status updated.</p> }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .history-item { padding: .6rem 0; border-bottom: 1px solid var(--ss-border); }
    .history-item:last-child { border-bottom: none; }
  `],
})
export class FindingDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  finding = signal<Finding | null>(null);
  saving = signal(false);
  saved = signal(false);

  newStatus = 'OPEN';
  comment = '';

  statusLabels: Record<string, string> = STATUS_LABELS;
  statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
  sevTag = severityTag;
  stTag = statusTag;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/findings']); return; }
    this.api.getFinding(id).subscribe({
      next: (f) => { this.finding.set(f); this.newStatus = f.status; },
      error: () => this.router.navigate(['/findings']),
    });
  }

  save() {
    const f = this.finding();
    if (!f) return;
    this.saving.set(true);
    this.saved.set(false);
    this.api.updateFindingStatus(f.id, this.newStatus, this.comment).subscribe({
      next: (updated) => {
        this.finding.set(updated);
        this.comment = '';
        this.saving.set(false);
        this.saved.set(true);
      },
      error: () => this.saving.set(false),
    });
  }
}
