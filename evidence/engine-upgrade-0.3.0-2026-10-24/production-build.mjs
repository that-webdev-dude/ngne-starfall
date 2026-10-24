import { readFileSync, writeFileSync, readdirSync, lstatSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url)), workspace = resolve(here, '../..');
export const baselineCommit = 'e288ffe837582bc0e3a1d79628781f1eafd1fae1';
const baselineInputs = ['src', 'tests', 'public', 'index.html', 'vite.config.ts', 'tsconfig.json', 'package.json', 'package-lock.json'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function git(args, options = {}) {
  const result = spawnSync('git', args, { cwd: workspace, windowsHide: true, maxBuffer: 128 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw result.error ?? Error(String(result.stderr));
  return result.stdout;
}
function variantVersion(variant) {
  if (!['baseline', 'candidate'].includes(variant)) throw Error('Invalid build variant');
  return variant === 'baseline' ? '0.2.2' : '0.3.0';
}
export function productionSourceRevision(variant, runGit = git) {
  variantVersion(variant);
  const revision = runGit(['rev-parse', variant === 'baseline' ? `${baselineCommit}^{commit}` : 'HEAD'], { encoding: 'utf8' }).trim();
  if (variant === 'baseline' && revision !== baselineCommit) throw Error('Baseline commit identity mismatch');
  return revision;
}
function assertBaselinePackage(manifest, lock) {
  if (manifest.dependencies?.['@ngne/core'] !== '0.2.2' || lock.packages?.['']?.dependencies?.['@ngne/core'] !== '0.2.2' ||
      lock.packages?.['node_modules/@ngne/core']?.version !== '0.2.2') throw Error('Pinned baseline must contain exact NGNE 0.2.2');
}
export function archiveBaseline(runGit = git) {
  const sourceRevision = productionSourceRevision('baseline', runGit);
  const manifest = JSON.parse(runGit(['show', `${sourceRevision}:package.json`], { encoding: 'utf8' }));
  const lock = JSON.parse(runGit(['show', `${sourceRevision}:package-lock.json`], { encoding: 'utf8' }));
  assertBaselinePackage(manifest, lock);
  return { sourceRevision, archive: runGit(['archive', '--format=tar', sourceRevision, ...baselineInputs]) };
}
export function reconstructBaseline(parent, runGit = git) {
  const snapshot = archiveBaseline(runGit);
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, 'baseline-source-'));
  const extract = spawnSync('tar', ['-xf', '-', '-C', root], { input: snapshot.archive, windowsHide: true });
  if (extract.error || extract.status !== 0) throw extract.error ?? Error(String(extract.stderr));
  assertBaselinePackage(JSON.parse(readFileSync(join(root, 'package.json'))), JSON.parse(readFileSync(join(root, 'package-lock.json'))));
  return { root, sourceRevision: snapshot.sourceRevision };
}
export function inventory(root) {
  const walk = path => readdirSync(path).sort().flatMap(name => {
    const file = join(path, name), info = lstatSync(file);
    if (info.isSymbolicLink()) throw Error('Linked build entry: ' + file);
    return info.isDirectory() ? walk(file) : [{ name: relative(root, file).split(sep).join('/'), bytes: info.size, sha256: digest(readFileSync(file)) }];
  });
  return walk(root);
}
export function productionManifest(root, variant, runGit = git) {
  const version = JSON.parse(readFileSync(join(root, 'node_modules/@ngne/core/package.json'))).version;
  if (version !== variantVersion(variant)) throw Error('Unexpected production build version');
  if (variant === 'baseline') assertBaselinePackage(JSON.parse(readFileSync(join(root, 'package.json'))), JSON.parse(readFileSync(join(root, 'package-lock.json'))));
  const manifest = {
    variant, version, command: 'npm.cmd run build', configuration: 'vite.config.ts',
    configurationSha256: digest(readFileSync(join(root, 'vite.config.ts'))),
    sourceRevision: productionSourceRevision(variant, runGit),
    sourceRoot: relative(workspace, root).split(sep).join('/') || '.',
    outputRoot: relative(workspace, join(root, 'dist')).split(sep).join('/'), files: inventory(join(root, 'dist'))
  };
  if (!manifest.files.some(file => file.name === 'index.html')) throw Error('Missing production entrypoint');
  return manifest;
}
export function recordProductionBuild(root, variant) {
  const manifest = productionManifest(root, variant);
  writeFileSync(join(here, `${variant}-production-build.json`), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
export function verifiedProductionBuild(variant) {
  const manifest = JSON.parse(readFileSync(join(here, `${variant}-production-build.json`)));
  if (manifest.variant !== variant || manifest.version !== variantVersion(variant) || manifest.command !== 'npm.cmd run build') throw Error('Production build identity mismatch');
  if (variant === 'baseline' && manifest.sourceRevision !== baselineCommit) throw Error('Baseline artifact revision mismatch');
  const root = resolve(workspace, manifest.outputRoot);
  if (variant === 'candidate' ? root !== join(workspace, 'dist') : !root.startsWith(join(workspace, '.test-output/ngne-030') + sep)) throw Error('Unexpected production build location');
  if (JSON.stringify(inventory(root)) !== JSON.stringify(manifest.files)) throw Error('Production build changed after validation');
  return { root, manifest };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== 'baseline') throw Error('Use production-build.mjs baseline; candidate build is recorded by check.mjs candidate');
  const { root } = reconstructBaseline(join(workspace, '.test-output/ngne-030'));
  for (const [name, command] of [['install', 'npm.cmd ci --no-audit --no-fund'], ['build', 'npm.cmd run build']]) {
    const result = spawnSync('cmd.exe', ['/d', '/s', '/c', command], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 180000 });
    writeFileSync(join(here, `baseline-production-${name}.log`), (result.stdout ?? '') + (result.stderr ?? ''));
    if (result.error || result.status !== 0) throw result.error ?? Error('Baseline production ' + name + ' failed');
    console.log('baseline production ' + name + ': passed');
  }
  const manifest = recordProductionBuild(root, 'baseline');
  console.log(`Baseline ${manifest.version}, source ${manifest.sourceRevision}, ${manifest.files.length} production files`);
}
