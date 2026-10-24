import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordProductionBuild } from './production-build.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const variant = process.argv[2];
if (!['baseline', 'candidate'].includes(variant)) throw Error('Expected baseline or candidate');
const version = JSON.parse(readFileSync(join(root, 'node_modules/@ngne/core/package.json'))).version;
if (version !== (variant === 'baseline' ? '0.2.2' : '0.3.0')) throw Error('Unexpected engine version');
const results = { variant, version, checks: {} };
function run(name, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 180000 });
  writeFileSync(join(here, `${variant}-${name}.log`), (result.stdout ?? '') + (result.stderr ?? ''));
  if (result.error) throw result.error;
  results.checks[name] = { exitCode: result.status };
  console.log(`${variant} ${name}: exit ${result.status}`);
  return result;
}
const tests = run('tests', process.execPath, ['--experimental-strip-types', '--test', '--test-reporter=tap', 'tests/*.test.ts']);
results.checks.tests.failures = [...tests.stdout.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1]);
results.checks.tests.counts = Object.fromEntries([...tests.stdout.matchAll(/^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$/gm)].map(match => [match[1], Number(match[2])]));
const expected = ['release glides a visible but short distance, then settles exactly', 'full-speed reversal overshoots less than three pixels'];
if (tests.status !== 1 || JSON.stringify(results.checks.tests.failures) !== JSON.stringify(expected)) throw Error('Unexpected test failures');
if (JSON.stringify(results.checks.tests.counts) !== JSON.stringify({ tests: 39, pass: 37, fail: 2, cancelled: 0, skipped: 0, todo: 0 })) throw Error('Unexpected test counts');
const build = run('build', 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd run build']);
if (build.status !== 0) throw Error('Build failed');
recordProductionBuild(root, variant);
const campaign = run('campaign', process.execPath, ['--experimental-strip-types', 'tests/run-campaign-bot.ts', join(here, `${variant}-campaign.json`), '17', '41', '83']);
if (campaign.status !== 0) throw Error('Campaign failed');
const outcomes = JSON.parse(readFileSync(join(here, `${variant}-campaign.json`))).results;
if (outcomes.some(result => result.outcome !== 'campaign-clear' || result.diagnostics.length)) throw Error('Campaign acceptance failed');
results.checks.campaign.outcomes = outcomes;
if (variant === 'candidate') {
  const baseline = JSON.parse(readFileSync(join(here, 'baseline-campaign.json'))).results;
  results.exactCampaignMatch = JSON.stringify(outcomes) === JSON.stringify(baseline);
  if (!results.exactCampaignMatch) throw Error('Campaign behavior changed');
}
writeFileSync(join(here, `${variant}-checks.json`), JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify({ variant, version, tests: results.checks.tests, campaigns: outcomes.map(({ seed, outcome }) => ({ seed, outcome })), exactCampaignMatch: results.exactCampaignMatch }));
