import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-settings',
  template: `
    <h1 class="page-title">Settings</h1>
    <p class="page-subtitle">Demo configuration overview</p>
    <div class="ss-card mt-3" style="max-width: 640px">
      <h3 class="mt-0">Signed in as</h3>
      <p>{{ auth.user()?.name }} ({{ auth.user()?.username }}, role {{ auth.user()?.role }})</p>
      <h3>AI assistant</h3>
      <p>
        The OpenAI API key is configured on the <strong>backend only</strong>, in
        <code>backend/.env</code> (<code>OPENAI_API_KEY</code>). It is never sent to the browser.
        Without a key, the assistant runs in demo mode with canned responses.
        The model is configurable via <code>OPENAI_MODEL</code>.
      </p>
      <h3>API documentation</h3>
      <p>
        Swagger / OpenAPI docs:
        <a href="http://localhost:3000/api/docs" target="_blank" rel="noopener">http://localhost:3000/api/docs</a>
      </p>
    </div>
  `,
})
export class SettingsComponent {
  auth = inject(AuthService);
}
