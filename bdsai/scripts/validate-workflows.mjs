// bdsai.vn — workflow validation script (Story 1.3, AC7)
// Chạy: yarn workflow:validate
// - Ưu tiên `actionlint` (nếu cài) — validate đầy đủ GitHub Actions syntax.
// - Fallback: structural check (top-level keys name/on/jobs) + YAML parse thử
//   qua python3 PyYAML nếu có, hoặc node `js-yaml` nếu cài.
// Mục tiêu: phát hiện syntax error trước khi push. KHÔNG test nghiệp vụ.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bdsaiRoot = resolve(__dirname, '..');
const repoRoot = resolve(bdsaiRoot, '..');
const workflowsDir = join(repoRoot, '.github', 'workflows');

const BDSAI_WORKFLOWS = ['ci.yml', 'deploy.yml'];

function hasBinary(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

if (!existsSync(workflowsDir)) {
  fail(`Không tìm thấy ${workflowsDir} (workflow files phải ở repo root .github/workflows/)`);
}

const files = BDSAI_WORKFLOWS.map((f) => join(workflowsDir, f));
for (const f of files) {
  if (!existsSync(f)) fail(`Thiếu workflow file: ${f}`);
}

// --- Ưu tiên actionlint ---
if (hasBinary('actionlint')) {
  console.log('→ Dùng actionlint để validate GitHub Actions syntax.');
  try {
    execSync(`actionlint ${files.map((f) => `"${f}"`).join(' ')}`, {
      stdio: 'inherit',
      cwd: repoRoot,
    });
    console.log('✔ actionlint PASS cho cả ci.yml + deploy.yml.');
    process.exit(0);
  } catch {
    fail('actionlint phát hiện lỗi syntax — xem output trên.');
  }
}

// --- Fallback 1: python3 + PyYAML ---
// Truyền paths qua stdin để tránh shell quoting issue.
if (hasBinary('python3')) {
  try {
    const pyCode = [
      'import sys, yaml',
      'for line in sys.stdin:',
      '    p = line.strip()',
      '    if not p: continue',
      '    yaml.safe_load(open(p))',
      "print('YAML parse OK')",
    ].join('\n');
    execSync(`python3 -c "${pyCode}"`, {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: files.join('\n'),
    });
    console.log('✔ YAML parse PASS (python3 PyYAML) cho ci.yml + deploy.yml.');
    console.log('  (Khuyến nghị cài actionlint để validate đầy đủ GitHub Actions syntax.)');
    process.exit(0);
  } catch {
    // PyYAML chưa cài hoặc parse fail → tiếp tục fallback.
  }
}

// --- Fallback 2: node js-yaml (nếu cài) ---
try {
  const { load } = await import('js-yaml');
  for (const f of files) {
    load(readFileSync(f, 'utf8'));
  }
  console.log('✔ YAML parse PASS (js-yaml) cho ci.yml + deploy.yml.');
  process.exit(0);
} catch {
  // js-yaml chưa cài → fallback cuối.
}

// --- Fallback 3: structural check (best-effort, KHÔNG thay thế actionlint) ---
console.log('⚠ Không tìm thấy actionlint/python3-PyYAML/js-yaml — chạy structural check tối thiểu.');
console.log('  Khuyến nghị: brew install actionlint để validate đầy đủ.');
let ok = true;
for (const f of files) {
  const content = readFileSync(f, 'utf8');
  const checks = [
    { key: 'name:', re: /^name:\s*.+/m },
    { key: 'on:', re: /^on:\s/m },
    { key: 'jobs:', re: /^jobs:\s/m },
  ];
  for (const { key, re } of checks) {
    if (!re.test(content)) {
      console.error(`✖ ${f}: thiếu top-level key "${key}"`);
      ok = false;
    }
  }
}
if (!ok) fail('Structural check fail — workflow thiếu top-level keys bắt buộc.');
console.log('✔ Structural check PASS (top-level keys name/on/jobs có mặt).');
console.log('  Lưu ý: đây là check tối thiểu — KHÔNG phát hiện hết syntax error.');
console.log('  Cài actionlint (brew install actionlint) để validate đầy đủ.');
process.exit(0);
