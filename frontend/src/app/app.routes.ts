import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'projects', loadComponent: () => import('./pages/projects/projects-list.component').then((m) => m.ProjectsListComponent) },
      { path: 'projects/:id', loadComponent: () => import('./pages/projects/project-detail.component').then((m) => m.ProjectDetailComponent) },
      { path: 'scans', loadComponent: () => import('./pages/scans/scans-list.component').then((m) => m.ScansListComponent) },
      { path: 'findings', loadComponent: () => import('./pages/findings/findings-list.component').then((m) => m.FindingsListComponent) },
      { path: 'findings/:id', loadComponent: () => import('./pages/findings/finding-detail.component').then((m) => m.FindingDetailComponent) },
      { path: 'assistant', loadComponent: () => import('./pages/assistant/assistant.component').then((m) => m.AssistantComponent) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.component').then((m) => m.SettingsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
