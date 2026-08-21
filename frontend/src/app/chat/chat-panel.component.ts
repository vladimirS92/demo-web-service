import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChatService } from './chat.service';

@Component({
  selector: 'app-chat-panel',
  imports: [CommonModule, FormsModule, ButtonModule],
  template: `
    <div class="chat-wrap">
      <div class="chat-messages" #scroller>
        @for (m of chat.messages(); track $index) {
          <div class="msg" [class.user]="m.role === 'user'">
            <div class="bubble">
              @if (m.actions?.length) {
                <div class="actions">
                  @for (a of m.actions; track a) {
                    <div class="action">{{ a }}</div>
                  }
                </div>
              }
              <div class="content">{{ m.content }}</div>
            </div>
          </div>
        }
        @if (chat.busy()) {
          <div class="msg">
            <div class="bubble typing"><span></span><span></span><span></span></div>
          </div>
        }
      </div>
      <div class="chat-input">
        <input
          type="text"
          [(ngModel)]="draft"
          (keyup.enter)="send()"
          [disabled]="chat.busy()"
          placeholder="Ask the assistant, e.g. 'Start a DAST scan on customer-portal'"
        />
        <p-button icon="pi pi-send" (onClick)="send()" [disabled]="chat.busy() || !draft.trim()" />
      </div>
    </div>
  `,
  styles: [`
    .chat-wrap { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: .6rem; background: #f8fafc; }
    .msg { display: flex; }
    .msg.user { justify-content: flex-end; }
    .bubble { max-width: 85%; padding: .6rem .8rem; border-radius: 10px; background: #fff; border: 1px solid var(--ss-border); font-size: .875rem; white-space: pre-wrap; word-break: break-word; }
    .msg.user .bubble { background: var(--ss-brand); color: #fff; border-color: var(--ss-brand); }
    .actions { margin-bottom: .4rem; display: flex; flex-direction: column; gap: .25rem; }
    .action { font-size: .78rem; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 6px; padding: .25rem .5rem; }
    .chat-input { display: flex; gap: .5rem; padding: .75rem; border-top: 1px solid var(--ss-border); background: #fff; }
    .chat-input input { flex: 1; border: 1px solid var(--ss-border); border-radius: 8px; padding: .55rem .75rem; font: inherit; outline: none; }
    .chat-input input:focus { border-color: var(--ss-brand); }
    .typing { display: flex; gap: 4px; align-items: center; }
    .typing span { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; animation: blink 1.2s infinite; }
    .typing span:nth-child(2) { animation-delay: .2s; }
    .typing span:nth-child(3) { animation-delay: .4s; }
    @keyframes blink { 0%, 80%, 100% { opacity: .3 } 40% { opacity: 1 } }
  `],
})
export class ChatPanelComponent implements AfterViewChecked {
  chat = inject(ChatService);
  draft = '';

  @ViewChild('scroller') scroller?: ElementRef<HTMLDivElement>;

  send() {
    this.chat.send(this.draft);
    this.draft = '';
  }

  ngAfterViewChecked() {
    const el = this.scroller?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
