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
 *      them — hand-written commands always win. A generated command whose name
 *      equals a hand-written one fails the run, since yargs would keep only one.
 *   4. Emit src/commands/generated.ts with a yargs command per remaining op.
 *
 * Generated commands are intentionally "raw": path params (operation or path
 * level) -> positionals, query and header params + body fields -> typed flags,
 * and `--body` takes the whole JSON body, passed straight through to the SDK. Run
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

function scanHandWritten() {
  const ids = new Set();
  const commands = new Set();
  for (const f of readdirSync(COMMANDS_DIR)) {
    if (!f.endsWith('.ts') || f === 'generated.ts') continue;
    const src = readFileSync(join(COMMANDS_DIR, f), 'utf8');
    for (const m of src.matchAll(/late\.[a-zA-Z]+\.([a-zA-Z]+)\(/g)) ids.add(m[1]);
    for (const m of src.matchAll(/\.command\(\s*'([a-z0-9-]+:[a-z0-9-]+)/g)) commands.add(m[1]);
  }
  return { ids, commands };
}

// Operation params override path-level params of the same name and location.
function mergedParameters(spec, pathItem, op) {
  const byKey = new Map();
  for (const raw of [...(pathItem.parameters || []), ...(op.parameters || [])]) {
    const p = resolveRef(spec, raw);
    byKey.set(`${p.in}:${p.name}`, p);
  }
  return [...byKey.values()];
}

// Top-level body fields, including those of allOf / oneOf / anyOf members.
// Only allOf members' `required` lists are binding for the whole body.
function bodyFields(spec, schemaRaw, seen = new Set()) {
  const s = resolveRef(spec, schemaRaw);
  const fields = new Map();
  const add = (name, kind, required) => {
    const prev = fields.get(name);
    fields.set(name, { name, in: 'body', required: required || !!prev?.required, kind: prev?.kind ?? kind });
  };
  const req = new Set(s.required || []);
  for (const [name, sch] of Object.entries(s.properties || {})) add(name, flagKind(spec, sch), req.has(name));
  for (const [combinator, binding] of [['allOf', true], ['oneOf', false], ['anyOf', false]]) {
    for (const member of s[combinator] || []) {
      if (member.$ref && seen.has(member.$ref)) continue;
      if (member.$ref) seen.add(member.$ref);
      for (const f of bodyFields(spec, member, seen).values()) add(f.name, f.kind, binding && f.required);
    }
  }
  return fields;
}

/* ── codegen ─────────────────────────────────────────────────────── */

function emitCommand(op) {
  const posList = op.positionals.map((p) => `<${p}>`).join(' ');
  const commandSpec = posList ? `${op.command} ${posList}` : op.command;

  const builderLines = [];
  for (const p of op.positionals) {
    builderLines.push(`          .positional('${p}', { type: 'string', describe: '${p}', demandOption: true })`);
  }
  for (const f of [...op.query, ...op.headers, ...op.body]) {
    const yType = f.kind === 'boolean' ? 'boolean' : f.kind === 'number' ? 'number' : 'string';
    // A body field can also arrive through the raw body flag, so only the API enforces it.
    const dem = f.required && f.in !== 'body' ? ', demandOption: true' : '';
    const note = f.kind === 'string-array' ? ' (comma-separated)' : f.kind === 'json' ? ' (JSON)' : '';
    const req = f.required && f.in === 'body' ? ', required' : '';
    builderLines.push(`          .option('${f.flag ?? f.name}', { type: '${yType}', describe: '${f.in} param${note}${req}'${dem} })`);
  }
  if (op.rawBodyFlag) {
    builderLines.push(`          .option('${op.rawBodyFlag}', { type: 'string', describe: 'Whole request body (JSON); field flags override its keys' })`);
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
  if (op.headers.length) {
    assigns.push(`          const headers: Record<string, string> = {};`);
    for (const f of op.headers) assigns.push(`          if (argv['${f.flag}'] !== undefined) headers['${f.name}'] = String(argv['${f.flag}']);`);
  }
  if (op.rawBodyFlag) {
    assigns.push(`          const body: Record<string, unknown> = argv['${op.rawBodyFlag}'] !== undefined ? JSON.parse(String(argv['${op.rawBodyFlag}'])) : {};`);
    for (const f of op.body) assigns.push(`          ${assignLine('body', f)}`);
  }
  const callArgs = [
    op.positionals.length ? 'path' : null,
    op.query.length ? 'query: query as any' : null,
    op.headers.length ? 'headers' : null,
    op.rawBodyFlag ? 'body: body as any' : null,
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
const { ids: implemented, commands: handWrittenCommands } = scanHandWritten();

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

    const params = mergedParameters(spec, methods, op);
    const positionals = params.filter((p) => p.in === 'path').map((p) => p.name);
    const query = params
      .filter((p) => p.in === 'query')
      .map((p) => ({ name: p.name, in: 'query', required: !!p.required, kind: flagKind(spec, p.schema) }));
    const headers = params
      .filter((p) => p.in === 'header')
      .map((p) => ({ name: p.name, flag: kebab(p.name), in: 'header', required: !!p.required, kind: 'string' }));
    const jsonBody = op.requestBody?.content?.['application/json'];
    const body = jsonBody ? [...bodyFields(spec, jsonBody.schema).values()] : [];
    const taken = new Set([...positionals, ...query.map((f) => f.name), ...headers.map((f) => f.flag), ...body.map((f) => f.name)]);
    const rawBodyFlag = jsonBody ? ['body', 'raw-body', 'request-body'].find((flag) => !taken.has(flag)) : undefined;

    const prefix = ns.toLowerCase();
    const action = deriveAction(opId, prefix);
    (actionsByPrefix[prefix] ??= new Map()).set(opId, action);
    ops.push({ opId, ns, method: opId, prefix, action, positionals, query, headers, body, rawBodyFlag, summary: op.summary || opId });
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

// yargs keeps the last command registered under a name, so a clash would silently
// replace a hand-written command with a generated one (or the reverse).
const clashes = ops.filter((op) => handWrittenCommands.has(op.command)).map((op) => op.command);
if (clashes.length) {
  throw new Error(`[generate-commands] generated commands clash with hand-written ones: ${clashes.join(', ')}. Rename the hand-written command.`);
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
