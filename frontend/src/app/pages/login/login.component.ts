import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="login-page">
      <div class="login-card ss-card">
        <div class="brand"><i class="pi pi-shield"></i> SecureScan</div>
        <p class="hint">Demo credentials: <code>admin</code> / <code>admin</code></p>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-column gap-3">
          <input pInputText formControlName="username" placeholder="Username" autocomplete="username" />
          <input pInputText type="password" formControlName="password" placeholder="Password" autocomplete="current-password" />
          @if (error()) { <div class="error">{{ error() }}</div> }
          <p-button
            type="submit"
            label="Sign in"
            icon="pi pi-sign-in"
            [loading]="loading()"
            [disabled]="form.invalid"
            styleClass="w-full"
          />
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(160deg, #0f1f3d 0%, #1e3a8a 100%); }
    .login-card { width: 340px; padding: 2rem; }
    .brand { font-size: 1.4rem; font-weight: 700; display: flex; align-items: center; gap: .5rem; justify-content: center; margin-bottom: .5rem; }
    .brand i { color: var(--ss-brand); }
    .hint { text-align: center; color: var(--ss-muted); font-size: .85rem; margin-top: 0; }
    .error { color: #b91c1c; font-size: .85rem; }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    username: ['admin', Validators.required],
    password: ['admin', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Login failed. Is the backend running?');
      },
    });
  }
}
