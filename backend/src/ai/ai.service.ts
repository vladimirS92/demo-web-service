import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FindingStatus, ScanType, Severity } from '@prisma/client';
import { FindingsService } from '../findings/findings.service';
import { ProjectsService } from '../projects/projects.service';
import { ScansService } from '../scans/scans.service';
import { StatsService } from '../stats/stats.service';
import { AI_TOOLS } from './ai-tools';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  reply: string;
  actions: string[]; // human-readable log of tool calls performed
  demoMode: boolean;
}

const SYSTEM_PROMPT = `You are the SecureScan assistant, embedded in a corporate security scanning web app.
You can manage projects, start SAST/DAST scans, query scans/findings/statistics and change finding statuses by calling the provided tools.
Rules:
- Always use tools to read or change data; never invent data.
- When the user references a project by name, pass it as projectName.
- Confirm what you did in short, clear sentences. Use plain text (no markdown tables).
- Severities: CRITICAL, HIGH, MEDIUM, LOW, INFO. Statuses: OPEN, CONFIRMED, FALSE_POSITIVE, ACCEPTED_RISK, FIXED.
- If a request is ambiguous (e.g. project name unknown), list the options and ask.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly projects: ProjectsService,
    private readonly scans: ScansService,
    private readonly findings: FindingsService,
    private readonly stats: StatsService,
  ) {}

  async chat(messages: ChatMessage[], username: string): Promise<ChatResult> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      // No key configured -> demo mode with a simple rule-based agent
      return this.demoChat(messages, username);
    }
    try {
      return await this.llmChat(messages, username, apiKey);
    } catch (err: any) {
      this.logger.error('LLM call failed', err?.message || err);
      return {
        reply:
          'I could not reach the AI service. Please check that OPENAI_API_KEY in backend/.env is valid ' +
          'and that you have internet access, then restart the backend. ' +
          `(Technical detail: ${err?.message || 'unknown error'})`,
        actions: [],
        demoMode: false,
      };
    }
  }

  // ---------- Real LLM agent (OpenAI function calling) ----------

  private async llmChat(history: ChatMessage[], username: string, apiKey: string): Promise<ChatResult> {
    const baseUrl = this.config.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
    const model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini';
    const actions: string[] = [];

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    // Agent loop: let the model call tools until it produces a final answer.
    for (let step = 0; step < 6; step++) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, tools: AI_TOOLS, temperature: 0.2 }),
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 401) throw new Error('OpenAI rejected the API key (401). Check OPENAI_API_KEY in backend/.env.');
        throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 200)}`);
      }
      const data: any = await res.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error('Empty response from the model');

      if (msg.tool_calls?.length) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* keep {} */ }
          const result = await this.executeTool(call.function.name, args, username, actions);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result).slice(0, 12000),
          });
        }
        continue; // let the model see tool results and continue
      }
      return { reply: msg.content || 'Done.', actions, demoMode: false };
    }
    return { reply: 'I stopped after too many tool steps. Please rephrase your request.', actions, demoMode: false };
  }

  // ---------- Tool execution (shared by LLM and demo mode) ----------

  private async executeTool(name: string, args: any, username: string, actions: string[]): Promise<any> {
    this.logger.log(`Tool call: ${name}(${JSON.stringify(args)})`);
    switch (name) {
      case 'list_projects': {
        const { items } = await this.projects.list(args.search || '', 1, 100);
        return items.map((p: any) => ({
          id: p.id, name: p.name, stack: p.stack, owner: p.owner,
          repoUrl: p.repoUrl, scans: p._count?.scans, findings: p._count?.findings,
        }));
      }
      case 'create_project': {
        const project = await this.projects.create({
          name: args.name,
          repoUrl: args.repoUrl,
          description: args.description || '',
          defaultBranch: args.defaultBranch || 'main',
          stack: args.stack || 'TypeScript',
          owner: args.owner || username,
        });
        actions.push(`🔧 Created project '${project.name}' (#${project.id})`);
        return project;
      }
      case 'update_project': {
        const existing = await this.projects.findByName(args.projectName);
        if (!existing) return { error: `No project named '${args.projectName}'` };
        const { projectName, ...fields } = args;
        const updated = await this.projects.update(existing.id, fields);
        actions.push(`🔧 Updated project '${existing.name}'`);
        return updated;
      }
      case 'start_scan': {
        const project = await this.projects.findByName(args.projectName);
        if (!project) return { error: `No project named '${args.projectName}'` };
        const scan = await this.scans.start(project.id, args.type as ScanType);
        actions.push(`🔧 Started ${args.type} scan on project '${project.name}' (scan #${scan.id})`);
        return { scanId: scan.id, status: scan.status, note: 'The scan runs asynchronously; it completes within ~10 seconds.' };
      }
      case 'list_scans': {
        let projectId: number | undefined;
        if (args.projectName) {
          const project = await this.projects.findByName(args.projectName);
          if (!project) return { error: `No project named '${args.projectName}'` };
          projectId = project.id;
        }
        const scans = await this.scans.list(projectId);
        return scans.slice(0, 30).map((s: any) => ({
          id: s.id, project: s.project.name, type: s.type, status: s.status,
          startedAt: s.startedAt, durationSec: s.durationSec, findingCount: s.findingCount,
        }));
      }
      case 'list_findings': {
        let projectId: number | undefined;
        if (args.projectName) {
          const project = await this.projects.findByName(args.projectName);
          if (!project) return { error: `No project named '${args.projectName}'` };
          projectId = project.id;
        }
        const { items, total } = await this.findings.list({
          projectId,
          severity: args.severity as Severity,
          status: args.status as FindingStatus,
          search: args.search,
          pageSize: 30,
        });
        return {
          total,
          findings: items.map((f: any) => ({
            id: f.id, title: f.title, severity: f.severity, status: f.status,
            project: f.project.name, cweId: f.cweId,
            location: f.filePath ? `${f.filePath}:${f.line}` : f.url,
          })),
        };
      }
      case 'update_finding_status': {
        const updated = await this.findings.updateStatus(
          Number(args.findingId), args.status as FindingStatus, args.comment || '', username,
        );
        actions.push(`🔧 Marked finding #${updated.id} as ${args.status}`);
        return { id: updated.id, title: updated.title, status: updated.status };
      }
      case 'get_stats':
        return this.stats.overview();
      default:
        return { error: `Unknown tool ${name}` };
    }
  }

  // ---------- Demo mode (no API key): rule-based fallback ----------

  private async demoChat(history: ChatMessage[], username: string): Promise<ChatResult> {
    const text = (history[history.length - 1]?.content || '').toLowerCase();
    const actions: string[] = [];
    const prefix = '🤖 Demo mode (no OpenAI key configured): ';

    // "start a sast/dast scan on <project>"
    const scanMatch = text.match(/start\s+(?:an?\s+)?(sast|dast)\s+scan\s+(?:on|for)\s+(?:project\s+)?["']?([\w .-]+?)["']?[.?!]?$/i);
    if (scanMatch) {
      const type = scanMatch[1].toUpperCase() as ScanType;
      const result = await this.executeTool('start_scan', { projectName: scanMatch[2].trim(), type }, username, actions);
      if (result.error) return { reply: prefix + result.error, actions, demoMode: true };
      return { reply: prefix + `Started a ${type} scan. It will complete in about 10 seconds — check the project's scan history.`, actions, demoMode: true };
    }
    if (text.includes('list') && text.includes('project')) {
      const items: any[] = await this.executeTool('list_projects', {}, username, actions);
      const names = items.map((p) => `#${p.id} ${p.name} (${p.stack})`).join(', ');
      return { reply: prefix + `You have ${items.length} projects: ${names}.`, actions, demoMode: true };
    }
    if (text.includes('critical')) {
      const res: any = await this.executeTool('list_findings', { severity: 'CRITICAL', status: text.includes('open') ? 'OPEN' : undefined }, username, actions);
      const lines = res.findings.slice(0, 8).map((f: any) => `#${f.id} ${f.title} [${f.project}]`).join('; ');
      return { reply: prefix + `${res.total} critical findings. Examples: ${lines || 'none'}.`, actions, demoMode: true };
    }
    if (text.includes('stat') || text.includes('how many')) {
      const s: any = await this.executeTool('get_stats', {}, username, actions);
      return {
        reply: prefix + `Open findings: ${s.kpis.totalOpenFindings}, critical open: ${s.kpis.criticalOpenFindings}, scans this month: ${s.kpis.scansThisMonth}, mean findings per scan: ${s.kpis.meanFindingsPerScan}.`,
        actions, demoMode: true,
      };
    }
    return {
      reply: prefix +
        'I can handle a few canned commands: "list projects", "start a SAST scan on <project name>", ' +
        '"show critical findings", "show stats". For the full natural-language agent, paste your OpenAI API key ' +
        'into backend/.env (OPENAI_API_KEY=...) and restart the backend.',
      actions, demoMode: true,
    };
  }
}
