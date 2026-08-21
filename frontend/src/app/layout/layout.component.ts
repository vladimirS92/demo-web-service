import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../core/auth.service';
import { ChatPanelComponent } from '../chat/chat-panel.component';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, ChatPanelComponent],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <i class="pi pi-shield"></i>
          <span>SecureScan</span>
        </div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active"><i class="pi pi-chart-pie"></i> Dashboard</a>
          <a routerLink="/projects" routerLinkActive="active"><i class="pi pi-folder"></i> Projects</a>
          <a routerLink="/scans" routerLinkActive="active"><i class="pi pi-sync"></i> Scans</a>
          <a routerLink="/findings" routerLinkActive="active"><i class="pi pi-exclamation-triangle"></i> Findings</a>
          <a routerLink="/assistant" routerLinkActive="active"><i class="pi pi-sparkles"></i> AI Assistant</a>
          <a routerLink="/settings" routerLinkActive="active"><i class="pi pi-cog"></i> Settings</a>
        </nav>
        <div class="sidebar-footer">
          <div class="user">
            <i class="pi pi-user"></i>
            <span>{{ auth.user()?.name || auth.user()?.username }}</span>
          </div>
          <button class="logout" (click)="auth.logout()"><i class="pi pi-sign-out"></i> Sign out</button>
        </div>
      </aside>

      <main class="content">
        <router-outlet />
      </main>

      <!-- Floating AI assistant, available on every page -->
      @if (chatOpen()) {
        <div class="chat-float">
          <div class="chat-float-header">
            <span><i class="pi pi-sparkles"></i> SecureScan Assistant</span>
            <button (click)="chatOpen.set(false)"><i class="pi pi-times"></i></button>
          </div>
          <app-chat-panel class="chat-float-body" />
        </div>
      }
      <button class="chat-fab" (click)="chatOpen.set(!chatOpen())" aria-label="Open AI assistant">
        <i class="pi" [class.pi-sparkles]="!chatOpen()" [class.pi-times]="chatOpen()"></i>
      </button>
    </div>
  `,
  styles: [`
    .shell { display: flex; min-height: 100vh; }
    .sidebar {
      width: 230px; flex-shrink: 0; background: var(--ss-sidebar); color: #cbd5e1;
      display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh;
    }
    .brand { display: flex; align-items: center; gap: .6rem; padding: 1.25rem 1.25rem; color: #fff; font-weight: 700; font-size: 1.1rem; letter-spacing: .3px; }
    .brand i { color: #60a5fa; font-size: 1.3rem; }
    nav { display: flex; flex-direction: column; gap: 2px; padding: .5rem .75rem; flex: 1; }
    nav a { display: flex; align-items: center; gap: .7rem; color: #cbd5e1; padding: .6rem .75rem; border-radius: 8px; font-size: .9rem; }
    nav a:hover { background: rgba(255,255,255,.06); color: #fff; }
    nav a.active { background: rgba(59,130,246,.25); color: #fff; }
    .sidebar-footer { padding: 1rem .75rem; border-top: 1px solid rgba(255,255,255,.08); }
    .user { display: flex; align-items: center; gap: .5rem; font-size: .85rem; margin-bottom: .5rem; }
    .logout { background: none; border: 1px solid rgba(255,255,255,.2); color: #cbd5e1; border-radius: 8px; padding: .4rem .7rem; cursor: pointer; font-size: .8rem; display: flex; align-items: center; gap: .4rem; }
    .logout:hover { background: rgba(255,255,255,.08); color: #fff; }
    .content { flex: 1; padding: 1.5rem 2rem; min-width: 0; }

    .chat-fab {
      position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 1001;
      width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer;
      background: var(--ss-brand); color: #fff; font-size: 1.2rem;
      box-shadow: 0 6px 20px rgba(29,78,216,.4);
    }
    .chat-float {
      position: fixed; right: 1.5rem; bottom: 5.5rem; z-index: 1000;
      width: 380px; max-width: calc(100vw - 2rem); height: 520px; max-height: calc(100vh - 8rem);
      background: #fff; border: 1px solid var(--ss-border); border-radius: 12px;
      box-shadow: 0 12px 40px rgba(15,23,42,.2); display: flex; flex-direction: column; overflow: hidden;
    }
    .chat-float-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: .7rem 1rem; background: var(--ss-sidebar); color: #fff; font-size: .9rem; font-weight: 600;
    }
    .chat-float-header button { background: none; border: none; color: #cbd5e1; cursor: pointer; }
    .chat-float-body { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  `],
})
export class LayoutComponent {
  auth = inject(AuthService);
  chatOpen = signal(false);
}
