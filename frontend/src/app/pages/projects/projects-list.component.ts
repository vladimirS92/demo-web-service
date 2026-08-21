import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../core/api.service';
import { Project } from '../../core/models';

@Component({
  selector: 'app-projects-list',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule],
  template: `
    <div class="flex justify-content-between align-items-start flex-wrap gap-3">
      <div>
        <h1 class="page-title">Projects</h1>
        <p class="page-subtitle">Repositories registered for security scanning</p>
      </div>
      <p-button label="New project" icon="pi pi-plus" (onClick)="openCreate()" />
    </div>

    <div class="ss-card mt-3">
      <input
        pInputText
        class="mb-3 w-full md:w-20rem"
        placeholder="Search name, stack, owner …"
        [(ngModel)]="search"
        (ngModelChange)="load()"
      />
      <p-table
        [value]="projects()"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        [loading]="loading()"
        dataKey="id"
      >
        <ng-template #header>
          <tr>
            <th>Name</th><th>Stack</th><th>Owner</th><th>Default branch</th>
            <th>Scans</th><th>Findings</th><th>Created</th><th></th>
          </tr>
        </ng-template>
        <ng-template #body let-p>
          <tr class="clickable-row" (click)="open(p)">
            <td class="font-medium">{{ p.name }}</td>
            <td>{{ p.stack }}</td>
            <td>{{ p.owner }}</td>
            <td>{{ p.defaultBranch }}</td>
            <td>{{ p._count?.scans ?? 0 }}</td>
            <td>{{ p._count?.findings ?? 0 }}</td>
            <td>{{ p.createdAt | date: 'mediumDate' }}</td>
            <td (click)="$event.stopPropagation()">
              <p-button icon="pi pi-pencil" [text]="true" size="small" (onClick)="openEdit(p)" />
              <p-button icon="pi pi-trash" [text]="true" size="small" severity="danger" (onClick)="remove(p)" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="8">No projects found. Create one to get started.</td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog
      [header]="editing() ? 'Edit project' : 'New project'"
      [(visible)]="dialogVisible"
      [modal]="true"
      [style]="{ width: '460px' }"
    >
      <form [formGroup]="form" class="flex flex-column gap-3 pt-2">
        <div>
          <label class="block mb-1 text-sm">Name *</label>
          <input pInputText class="w-full" formControlName="name" placeholder="payments-api" />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <small class="text-red-600">Name is required.</small>
          }
        </div>
        <div>
          <label class="block mb-1 text-sm">Repository URL *</label>
          <input pInputText class="w-full" formControlName="repoUrl" placeholder="https://git.example.com/org/repo" />
          @if (form.controls.repoUrl.touched && form.controls.repoUrl.invalid) {
            <small class="text-red-600">Repository URL is required.</small>
          }
        </div>
        <div>
          <label class="block mb-1 text-sm">Description</label>
          <input pInputText class="w-full" formControlName="description" />
        </div>
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="block mb-1 text-sm">Default branch</label>
            <input pInputText class="w-full" formControlName="defaultBranch" />
          </div>
          <div class="flex-1">
            <label class="block mb-1 text-sm">Stack</label>
            <input pInputText class="w-full" formControlName="stack" placeholder="TypeScript" />
          </div>
        </div>
        <div>
          <label class="block mb-1 text-sm">Owner</label>
          <input pInputText class="w-full" formControlName="owner" />
        </div>
        @if (error()) { <div class="text-red-600 text-sm">{{ error() }}</div> }
      </form>
      <ng-template #footer>
        <p-button label="Cancel" [text]="true" (onClick)="dialogVisible = false" />
        <p-button [label]="editing() ? 'Save changes' : 'Create project'" [disabled]="form.invalid" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ProjectsListComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  loading = signal(false);
  editing = signal<Project | null>(null);
  error = signal('');
  dialogVisible = false;
  search = '';

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    repoUrl: ['', Validators.required],
    description: [''],
    defaultBranch: ['main'],
    stack: ['TypeScript'],
    owner: [''],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.listProjects(this.search).subscribe((res) => {
      this.projects.set(res.items);
      this.loading.set(false);
    });
  }

  open(p: Project) { this.router.navigate(['/projects', p.id]); }

  openCreate() {
    this.editing.set(null);
    this.error.set('');
    this.form.reset({ name: '', repoUrl: '', description: '', defaultBranch: 'main', stack: 'TypeScript', owner: '' });
    this.dialogVisible = true;
  }

  openEdit(p: Project) {
    this.editing.set(p);
    this.error.set('');
    this.form.reset({
      name: p.name, repoUrl: p.repoUrl, description: p.description,
      defaultBranch: p.defaultBranch, stack: p.stack, owner: p.owner,
    });
    this.dialogVisible = true;
  }

  save() {
    if (this.form.invalid) return;
    const data = this.form.getRawValue();
    const current = this.editing();
    const req = current ? this.api.updateProject(current.id, data) : this.api.createProject(data);
    req.subscribe({
      next: () => { this.dialogVisible = false; this.load(); },
      error: (err) => this.error.set(err?.error?.message || 'Save failed'),
    });
  }

  remove(p: Project) {
    if (!confirm(`Delete project "${p.name}" and all its scans/findings?`)) return;
    this.api.deleteProject(p.id).subscribe(() => this.load());
  }
}
