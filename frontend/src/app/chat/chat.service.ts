import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';

export interface UiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
  demoMode?: boolean;
}

/** Shared chat state so the floating widget and the Assistant page show the same history. */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private api = inject(ApiService);

  readonly messages = signal<UiChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I am the SecureScan assistant. I can create projects, start SAST/DAST scans, ' +
        'query findings, change finding statuses and answer questions about your statistics. ' +
        'Try: "Start a SAST scan on payments-api" or "Show me all critical open findings".',
    },
  ]);
  readonly busy = signal(false);

  send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || this.busy()) return;
    this.messages.update((m) => [...m, { role: 'user', content: trimmed }]);
    this.busy.set(true);

    const history = this.messages()
      .map(({ role, content }) => ({ role, content }))
      .slice(-16); // keep the payload small

    this.api.chat(history).subscribe({
      next: (res) => {
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', content: res.reply, actions: res.actions, demoMode: res.demoMode },
        ]);
        this.busy.set(false);
      },
      error: (err) => {
        this.messages.update((m) => [
          ...m,
          {
            role: 'assistant',
            content:
              'Something went wrong talking to the backend (' +
              (err?.error?.message || err.message || 'unknown error') +
              '). Is the backend running on http://localhost:3000?',
          },
        ]);
        this.busy.set(false);
      },
    });
  }

  clear() {
    this.messages.set(this.messages().slice(0, 1));
  }
}
