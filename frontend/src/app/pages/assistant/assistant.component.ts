import { Component } from '@angular/core';
import { ChatPanelComponent } from '../../chat/chat-panel.component';

@Component({
  selector: 'app-assistant',
  imports: [ChatPanelComponent],
  template: `
    <h1 class="page-title">AI Assistant</h1>
    <p class="page-subtitle">
      Ask in plain English — the agent can create projects, start scans, query findings,
      change statuses and answer statistics questions. Every action it performs is shown in the chat.
    </p>
    <div class="assistant-card ss-card">
      <app-chat-panel class="fill" />
    </div>
  `,
  styles: [`
    .assistant-card { margin-top: 1rem; height: calc(100vh - 11rem); padding: 0; overflow: hidden; display: flex; }
    .fill { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  `],
})
export class AssistantComponent {}
