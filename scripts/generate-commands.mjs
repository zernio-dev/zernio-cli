/**
 * Generate CLI commands for every API operation the hand-written commands don't
 * already cover, so the CLI tracks the full API surface.
 *
 * How it works:
 *   1. Load the OpenAPI spec (ZERNIO_OPENAPI = path or URL; defaults to the
 *      public spec) for path/query/body field shapes.
 *   2. Introspect the installed @zernio/node SDK at runtime to map each
 *      operationId -> { namespace, method }. The SDK is the source of truth for
 *      what's actually callable.
 *   3. Scan src/commands/*.ts (except the generated file) for operationIds that
 *      are ALREADY hand-implemented (via `late.<ns>.<method>(` calls) and skip
 *      them — hand-written commands always win.
 *   4. Emit src/commands/generated.ts with a yargs command per remaining op.
 *
 * Generated commands are intentionally "raw": path params -> positionals, query
 * params + body fields -> typed flags, passed straight through to the SDK. Run
 * `npm run gen` after an SDK bump to pick up new endpoints.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import Late from '@zernio/node';

const here = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = resolve(here, '../src/commands');
const OUT = join(COMMANDS_DIR, 'generated.ts');
const SPEC_SRC = process.env.ZERNIO_OPENAPI || 'https://zernio.com/openapi.yaml';

/* ── helpers ─────────────────────────────────────────────────────── */

const kebab = (s) =>
  String(s)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

const singular = (w) => (w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.endsWith('s') ? w.slice(0, -1) : w);

function resolveRef(spec, node, seen = new Set()) {
  let g = 0;
  while (node && node.$ref && g++ < 20) {
    if (seen.has(node.$ref)) return { type: 'object' };
    seen.add(node.$ref);
    const parts = node.$ref.slice(2).split('/');
    let n = spec;
    for (const k of parts) n = n?.[k];
    node = n;
  }
  return node || {};
}

// Classify a schema into how the CLI flag should be handled.
function flagKind(spec, schemaRaw) {
  const s = resolveRef(spec, schemaRaw);
  if (s.type === 'boolean') return 'boolean';
  if (s.type === 'integer' || s.type === 'number') return 'number';
  if (s.type === 'array') {
    const items = resolveRef(spec, s.items);
    return items.type && items.type !== 'object' && items.type !== 'array' ? 'string-array' : 'json';
  }
  if (s.type === 'object' || s.oneOf || s.anyOf || s.allOf) return 'json';
  return 'string';
}

// Derive a short action name from operationId, stripping resource words that
// duplicate the namespace prefix. Falls back to the full kebab on collision.
function deriveAction(operationId, prefix) {
  const words = kebab(operationId).split('-');
  const drop = new Set([prefix, singular(prefix)]);
  const kept = words.filter((w) => !drop.has(w));
  return (kept.length ? kept : words).join('-');
}

/* ── load spec + SDK map ─────────────────────────────────────────── */

async function loadSpec() {
  if (/^https?:\/\//.test(SPEC_SRC)) {
    const res = await fetch(SPEC_SRC, { headers: { accept: 'text/yaml,application/yaml,*/*' } });
    if (!res.ok) throw new Error(`Failed to fetch spec from ${SPEC_SRC}: ${res.status}`);
    return parseYaml(await res.text());
  }
  return parseYaml(readFileSync(SPEC_SRC, 'utf8'));
}

function buildSdkMap() {
  const client = new Late({ apiKey: 'x' });
  const map = {}; // method -> namespace
  for (const ns of Object.keys(client)) {
    const v = client[ns];
    if (!v || typeof v !== 'object' || Array.isArray(v) || ns.startsWith('_')) continue;
    for (const m of Object.keys(v)) {
      if (!(m in map)) map[m] = ns;
    }
  }
  return map;
}

function implementedOperationIds() {
  const ids = new Set();
  for (const f of readdirSync(COMMANDS_DIR)) {
    if (!f.endsWith('.ts') || f === 'generated.ts') continue;
    const src = readFileSync(join(COMMANDS_DIR, f), 'utf8');
    for (const m of src.matchAll(/late\.[a-zA-Z]+\.([a-zA-Z]+)\(/g)) ids.add(m[1]);
  }
  return ids;
}

/* ── codegen ─────────────────────────────────────────────────────── */

function emitCommand(op) {
  const posList = op.positionals.map((p) => `<${p}>`).join(' ');
  const commandSpec = posList ? `${op.command} ${posList}` : op.command;

  const builderLines = [];
  for (const p of op.positionals) {
    builderLines.push(`          .positional('${p}', { type: 'string', describe: '${p}', demandOption: true })`);
  }
  for (const f of [...op.query, ...op.body]) {
    const yType = f.kind === 'boolean' ? 'boolean' : f.kind === 'number' ? 'number' : 'string';
    const dem = f.required ? ', demandOption: true' : '';
    const note = f.kind === 'string-array' ? ' (comma-separated)' : f.kind === 'json' ? ' (JSON)' : '';
    builderLines.push(`          .option('${f.name}', { type: '${yType}', describe: '${f.in} param${note}'${dem} })`);
  }
  const builder = builderLines.length ? `(y) =>\n        y\n${builderLines.join('\n')}` : '(y) => y';

  const assigns = [];
  if (op.positionals.length) {
    assigns.push(`          const path = { ${op.positionals.map((p) => `${p}: argv['${p}']`).join(', ')} };`);
  }
  if (op.query.length) {
    assigns.push(`          const query: Record<string, unknown> = {};`);
    for (const f of op.query) assigns.push(`          ${assignLine('query', f)}`);
  }
  if (op.body.length) {
    assigns.push(`          const body: Record<string, unknown> = {};`);
    for (const f of op.body) assigns.push(`          ${assignLine('body', f)}`);
  }
  const callArgs = [
    op.positionals.length ? 'path' : null,
    op.query.length ? 'query: query as any' : null,
    op.body.length ? 'body: body as any' : null,
  ].filter(Boolean).join(', ');
  const callObj = callArgs ? `{ ${callArgs} }` : '';

  return `    .command(
      '${commandSpec}',
      '${op.summary.replace(/'/g, "\\'")}',
      ${builder},
      async (argv) => {
        try {
          const late = createClient();
${assigns.join('\n')}
          const { data } = await (late as any).${op.ns}.${op.method}(${callObj});
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )`;
}

function assignLine(target, f) {
  const v = `argv['${f.name}']`;
  if (f.kind === 'string-array') {
    return `if (${v} !== undefined) ${target}['${f.name}'] = String(${v}).split(',').map((s) => s.trim()).filter(Boolean);`;
  }
  if (f.kind === 'json') {
    return `if (${v} !== undefined) ${target}['${f.name}'] = JSON.parse(String(${v}));`;
  }
  return `if (${v} !== undefined) ${target}['${f.name}'] = ${v};`;
}

/* ── main ────────────────────────────────────────────────────────── */

const spec = await loadSpec();
const sdkMap = buildSdkMap();
const implemented = implementedOperationIds();

const ops = [];
const seenCommands = new Set();
const actionsByPrefix = {}; // prefix -> Map(action -> [op])

for (const [path, methods] of Object.entries(spec.paths || {})) {
  for (const [method, op] of Object.entries(methods)) {
    if (!op || typeof op !== 'object' || !op.operationId) continue;
    const opId = op.operationId;
    const ns = sdkMap[opId];
    if (!ns) continue; // not exposed by the SDK
    if (implemented.has(opId)) continue; // hand-written wins

    const params = (op.parameters || []).map((p) => resolveRef(spec, p));
    const positionals = params.filter((p) => p.in === 'path').map((p) => p.name);
    const query = params
      .filter((p) => p.in === 'query')
      .map((p) => ({ name: p.name, in: 'query', required: !!p.required, kind: flagKind(spec, p.schema) }));
    const bodySchema = resolveRef(spec, op.requestBody?.content?.['application/json']?.schema);
    const req = new Set(bodySchema?.required || []);
    const body = bodySchema?.properties
      ? Object.entries(bodySchema.properties).map(([name, sch]) => ({
          name,
          in: 'body',
          required: req.has(name),
          kind: flagKind(spec, sch),
        }))
      : [];

    const prefix = ns.toLowerCase();
    const action = deriveAction(opId, prefix);
    (actionsByPrefix[prefix] ??= new Map()).set(opId, action);
    ops.push({ opId, ns, method: opId, prefix, action, positionals, query, body, summary: op.summary || opId });
  }
}

// Resolve action collisions within a prefix by falling back to full kebab.
for (const op of ops) {
  const sameAction = ops.filter((o) => o.prefix === op.prefix && o.action === op.action);
  if (sameAction.length > 1) op.action = kebab(op.opId);
  op.command = `${op.prefix}:${op.action}`;
  if (seenCommands.has(op.command)) op.command = `${op.prefix}:${kebab(op.opId)}`;
  seenCommands.add(op.command);
}

ops.sort((a, b) => a.command.localeCompare(b.command));

const file = `// AUTO-GENERATED by scripts/generate-commands.mjs — DO NOT EDIT BY HAND.
// Covers every API operation not already hand-implemented in the other command
// files. Re-run \`npm run gen\` after an SDK bump. ${ops.length} commands.
import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

export function registerGeneratedCommands(yargs: Argv): Argv {
  return yargs
${ops.map(emitCommand).join('\n')};
}
`;

writeFileSync(OUT, file);
console.log(`[generate-commands] wrote ${ops.length} commands -> ${OUT}`);
