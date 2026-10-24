import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { baselineCommit, reconstructBaseline, archiveBaseline, productionManifest, productionSourceRevision } from './production-build.mjs';
const here = dirname(fileURLToPath(import.meta.url)), workspace = resolve(here, '../..');
const parent = join(workspace, '.test-output/ngne-030/baseline-reconstruction-tests');
mkdirSync(parent, { recursive: true });
function temporaryRoot(t) {
  const root = mkdtempSync(join(parent, 'case-'));
  t.after(() => {
    if (!resolve(root).startsWith(resolve(parent) + sep)) throw Error('Unsafe acceptance test cleanup path');
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}
function actualGit(args, options = {}) {
  const result = spawnSync('git', args, { cwd: workspace, windowsHide: true, maxBuffer: 128 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw result.error ?? Error(String(result.stderr));
  return result.stdout;
}

test('reconstructs the pinned 0.2.2 snapshot and metadata when virtual HEAD contains the 0.3.0 migration', t => {
  const root = temporaryRoot(t), head = 'f'.repeat(40), calls = [];
  const migrated = { manifest: JSON.parse(readFileSync(join(workspace, 'package.json'))), lock: JSON.parse(readFileSync(join(workspace, 'package-lock.json'))) };
  assert.equal(migrated.manifest.dependencies['@ngne/core'], '0.3.0');
  assert.equal(migrated.lock.packages['node_modules/@ngne/core'].version, '0.3.0');
  const headRoot = join(root, 'virtual-head'); mkdirSync(headRoot);
  writeFileSync(join(headRoot, 'package.json'), JSON.stringify(migrated.manifest));
  writeFileSync(join(headRoot, 'package-lock.json'), JSON.stringify(migrated.lock));
  const headArchive = spawnSync('tar', ['-cf', '-', '-C', headRoot, 'package.json', 'package-lock.json'], { windowsHide: true });
  if (headArchive.error || headArchive.status !== 0) throw headArchive.error ?? Error(String(headArchive.stderr));
  // Only Git's HEAD is simulated. Pinned-commit reads, archive creation and extraction use real Git/tar.
  function virtualGit(args, options) {
    calls.push(args);
    if (args[0] === 'rev-parse' && args[1] === 'HEAD') return head + '\n';
    if (args[0] === 'show' && args[1] === `${head}:package.json`) return JSON.stringify(migrated.manifest);
    if (args[0] === 'show' && args[1] === `${head}:package-lock.json`) return JSON.stringify(migrated.lock);
    if (args[0] === 'archive' && ['HEAD', head].includes(args[2])) return headArchive.stdout;
    return actualGit(args, options);
  }
  assert.equal(productionSourceRevision('candidate', virtualGit), head);
  const baselineCallsStart = calls.length;
  const reconstructed = reconstructBaseline(join(root, 'snapshots'), virtualGit);
  assert.equal(reconstructed.sourceRevision, baselineCommit);
  const manifest = JSON.parse(readFileSync(join(reconstructed.root, 'package.json')));
  const lock = JSON.parse(readFileSync(join(reconstructed.root, 'package-lock.json')));
  assert.equal(manifest.dependencies['@ngne/core'], '0.2.2');
  assert.equal(lock.packages['node_modules/@ngne/core'].version, '0.2.2');
  assert.ok(readFileSync(join(reconstructed.root, 'public/LICENSE-NGNE.txt')).length > 0);
  // A minimal output is sufficient here to check metadata; the CLI separately installs/builds the real snapshot.
  mkdirSync(join(reconstructed.root, 'node_modules/@ngne/core'), { recursive: true });
  writeFileSync(join(reconstructed.root, 'node_modules/@ngne/core/package.json'), JSON.stringify({version:'0.2.2'}));
  mkdirSync(join(reconstructed.root, 'dist'));
  writeFileSync(join(reconstructed.root, 'dist/index.html'), '<!doctype html>');
  const recorded = productionManifest(reconstructed.root, 'baseline', virtualGit);
  assert.equal(recorded.sourceRevision, baselineCommit);
  assert.equal(recorded.version, '0.2.2');
  assert.ok(calls.slice(baselineCallsStart).every(args => !args.some(arg => arg === 'HEAD' || arg.startsWith(head))));
  assert.ok(calls.some(args => args[0] === 'archive' && args[2] === baselineCommit));
});

test('rejects a pinned baseline whose manifest or lockfile no longer specifies 0.2.2', () => {
  const manifest = JSON.parse(readFileSync(join(workspace, 'package.json')));
  const lock = JSON.parse(readFileSync(join(workspace, 'package-lock.json')));
  const calls = [];
  const virtualGit = args => {
    calls.push(args);
    if (args[0] === 'rev-parse') return baselineCommit + '\n';
    if (args[0] === 'show' && args[1].endsWith(':package.json')) return JSON.stringify(manifest);
    if (args[0] === 'show') return JSON.stringify(lock);
    throw Error('Archive should not be requested');
  };
  assert.throws(() => archiveBaseline(virtualGit), /Pinned baseline must contain exact NGNE 0.2.2/);
  assert.ok(!calls.some(args => args[0] === 'archive'));
});
