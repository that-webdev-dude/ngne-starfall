import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyPackage } from './verify-package.mjs';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../..');
const parent = join(root, '.test-output/ngne-030/package-verifier-tests');
mkdirSync(parent, { recursive: true });
function fixture(t) {
  const path = mkdtempSync(join(parent, 'case-'));
  t.after(() => {
    if (!resolve(path).startsWith(resolve(parent) + sep)) throw Error('Unsafe test cleanup path');
    rmSync(path, { recursive: true, force: true });
  });
  const evidence = join(path, 'evidence/engine-upgrade-0.3.0-2026-10-24');
  mkdirSync(evidence, { recursive: true });
  cpSync(join(here, 'registry.json'), join(evidence, 'registry.json'));
  cpSync(join(root, 'package.json'), join(path, 'package.json'));
  cpSync(join(root, 'package-lock.json'), join(path, 'package-lock.json'));
  cpSync(join(root, 'node_modules/@ngne/core'), join(path, 'node_modules/@ngne/core'), { recursive: true });
  mkdirSync(join(path, '.test-output/ngne-030'), { recursive: true });
  cpSync(join(root, '.test-output/ngne-030/ngne-core-0.3.0.tgz'), join(path, '.test-output/ngne-030/ngne-core-0.3.0.tgz'));
  return path;
}
function editJson(path, edit) { const value = JSON.parse(readFileSync(path)); edit(value); writeFileSync(path, JSON.stringify(value)); }

test('valid published package reports measured archive hashes and 56 matching files', t => {
  const result = verifyPackage(fixture(t));
  assert.equal(result.version, '0.3.0'); assert.equal(result.files.length, 56);
  assert.equal(result.tarballSha256, '5d43cad5577fcd6bc40c0030415cf24a7b52a53200ff867733a8ffe3b9d9dfeb');
  assert.equal(result.installedMatchesRegistryTarball, true);
});
test('rejects a modified archive instead of emitting the published checksum', t => {
  const path = fixture(t), archive = join(path, '.test-output/ngne-030/ngne-core-0.3.0.tgz');
  const bytes = readFileSync(archive); bytes[bytes.length - 1] ^= 1; writeFileSync(archive, bytes);
  assert.throws(() => verifyPackage(path), /archive checksum mismatch/);
});
test('rejects a 0.2.2 installation even if a stale extracted reference also says 0.2.2', t => {
  const path = fixture(t), stale = join(path, '.test-output/ngne-030/package/package');
  editJson(join(path, 'node_modules/@ngne/core/package.json'), value => { value.version = '0.2.2'; });
  cpSync(join(path, 'node_modules/@ngne/core'), stale, { recursive: true });
  assert.throws(() => verifyPackage(path), /version or identity mismatch/);
});
test('rejects lockfile integrity that differs from the measured archive', t => {
  const path = fixture(t);
  editJson(join(path, 'package-lock.json'), value => { value.packages['node_modules/@ngne/core'].integrity = 'sha512-invalid'; });
  assert.throws(() => verifyPackage(path), /integrity mismatch/);
});
test('compares installation directly against the archive rather than a matching stale extraction', t => {
  const path = fixture(t), target = join(path, 'node_modules/@ngne/core/dist/engine/index.js');
  writeFileSync(target, readFileSync(target, 'utf8') + '\n// altered installation\n');
  cpSync(join(path, 'node_modules/@ngne/core'), join(path, '.test-output/ngne-030/package/package'), { recursive: true });
  assert.throws(() => verifyPackage(path), /Installed package mismatch/);
});
test('rejects additional installed files', t => {
  const path = fixture(t); writeFileSync(join(path, 'node_modules/@ngne/core/extra.txt'), 'unexpected');
  assert.throws(() => verifyPackage(path), /Installed package mismatch/);
});
