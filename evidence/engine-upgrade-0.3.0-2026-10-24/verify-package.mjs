import { readdirSync, readFileSync, lstatSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const expectedVersion = '0.3.0';
// Expected value from the published release, compared with the measured archive hash.
const expectedReleaseSha256 = '5d43cad5577fcd6bc40c0030415cf24a7b52a53200ff867733a8ffe3b9d9dfeb';
const hash = (bytes, algorithm = 'sha256', encoding = 'hex') => createHash(algorithm).update(bytes).digest(encoding);
const json = path => JSON.parse(readFileSync(path, 'utf8'));

export function verifyPackage(root = resolve(here, '../..')) {
  const evidence = join(root, 'evidence/engine-upgrade-0.3.0-2026-10-24');
  const archive = join(root, '.test-output/ngne-030/ngne-core-0.3.0.tgz');
  const registry = json(join(evidence, 'registry.json'));
  const manifest = json(join(root, 'package.json'));
  const lock = json(join(root, 'package-lock.json'));
  const locked = lock.packages?.['node_modules/@ngne/core'];
  const installedRoot = join(root, 'node_modules/@ngne/core');
  const installed = json(join(installedRoot, 'package.json'));
  if (registry.version !== expectedVersion || installed.version !== expectedVersion || installed.name !== '@ngne/core' ||
      manifest.dependencies?.['@ngne/core'] !== expectedVersion || locked?.version !== expectedVersion ||
      lock.packages?.['']?.dependencies?.['@ngne/core'] !== expectedVersion) throw Error('Package version or identity mismatch');
  const bytes = readFileSync(archive);
  const tarballSha256 = hash(bytes);
  if (tarballSha256 !== expectedReleaseSha256) throw Error('Published release archive checksum mismatch');
  const tarballIntegrity = 'sha512-' + hash(bytes, 'sha512', 'base64');
  if (tarballIntegrity !== registry.dist.integrity || tarballIntegrity !== locked.integrity ||
      locked.resolved !== registry.dist.tarball) throw Error('Archive, registry and lockfile integrity mismatch');
  function tar(args, encoding) {
    const result = spawnSync('tar', args, { encoding, windowsHide: true, timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error('Cannot read package archive: ' + result.stderr);
    return result.stdout;
  }
  const entries = tar(['-tzf', archive], 'utf8').trim().split(/\r?\n/).filter(name => !name.endsWith('/'));
  if (new Set(entries).size !== entries.length || entries.some(name => !name.startsWith('package/') || name.includes('..') || name.includes('\\'))) throw Error('Invalid package archive inventory');
  const archived = new Map(entries.map(name => [name.slice('package/'.length), tar(['-xOzf', archive, name])]));
  const archivedManifest = JSON.parse(archived.get('package.json')?.toString('utf8') ?? 'null');
  if (archivedManifest?.name !== installed.name || archivedManifest?.version !== installed.version) throw Error('Archived package identity mismatch');
  function files(path) {
    return readdirSync(path).sort().flatMap(name => {
      const file = join(path, name), info = lstatSync(file);
      if (info.isSymbolicLink()) throw Error('Linked installed package entry: ' + file);
      return info.isDirectory() ? files(file) : [file];
    });
  }
  const inventory = files(installedRoot).map(path => {
    const name = relative(installedRoot, path).split(sep).join('/');
    const actual = readFileSync(path), reference = archived.get(name);
    if (!reference || !reference.equals(actual)) throw Error('Installed package mismatch: ' + name);
    return { name, sha256: hash(actual) };
  });
  if (inventory.length !== archived.size || inventory.length !== registry.dist.fileCount) throw Error('Package file inventory mismatch');
  return { version: installed.version, tarballSha256, tarballIntegrity, publishedChecksumMatches: true,
    registryAndLockIntegrityMatch: true, installedMatchesRegistryTarball: true, files: inventory };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyPackage();
  writeFileSync(join(here, 'package-verification.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`Verified ${result.files.length} installed files; measured tarball SHA256 ${result.tarballSha256}`);
}
