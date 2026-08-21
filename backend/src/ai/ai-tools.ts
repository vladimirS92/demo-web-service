// OpenAI function-calling tool definitions for the SecureScan agent.
// Each tool maps 1:1 to a backend service capability.

export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_projects',
      description: 'List registered projects, optionally filtered by a search term.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Optional text to filter by name/description/stack/owner' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Register a new project (repository) for scanning.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          repoUrl: { type: 'string', description: 'Git repository URL' },
          defaultBranch: { type: 'string', description: 'Defaults to "main"' },
          stack: { type: 'string', description: 'Language/stack tag, e.g. "TypeScript"' },
          owner: { type: 'string' },
        },
        required: ['name', 'repoUrl'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_project',
      description: 'Update fields of an existing project, identified by its name.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Current name of the project to update' },
          name: { type: 'string' },
          description: { type: 'string' },
          repoUrl: { type: 'string' },
          defaultBranch: { type: 'string' },
          stack: { type: 'string' },
          owner: { type: 'string' },
        },
        required: ['projectName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_scan',
      description: 'Start a SAST (static) or DAST (dynamic) security scan on a project.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string' },
          type: { type: 'string', enum: ['SAST', 'DAST'] },
        },
        required: ['projectName', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_scans',
      description: 'List scans with status, duration and finding counts, optionally for one project.',
      parameters: {
        type: 'object',
        properties: { projectName: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_findings',
      description: 'Query security findings with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] },
          status: { type: 'string', enum: ['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'ACCEPTED_RISK', 'FIXED'] },
          search: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_finding_status',
      description: 'Change the review status of a finding by its numeric id, with an optional comment.',
      parameters: {
        type: 'object',
        properties: {
          findingId: { type: 'number' },
          status: { type: 'string', enum: ['OPEN', 'CONFIRMED', 'FALSE_POSITIVE', 'ACCEPTED_RISK', 'FIXED'] },
          comment: { type: 'string' },
        },
        required: ['findingId', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stats',
      description: 'Get dashboard statistics: open/critical counts, scans this month, findings by severity/status, top vulnerable projects.',
      parameters: { type: 'object', properties: {} },
    },
  },
];
