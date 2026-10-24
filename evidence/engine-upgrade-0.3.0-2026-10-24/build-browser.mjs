// Build-only instrumentation around the existing campaign fixture. Production sources are unchanged.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), workspace = resolve(here, '../..');
const variant = process.argv[2];
if (!['baseline', 'candidate'].includes(variant)) throw Error('Expected baseline or candidate');
const root = variant === 'baseline' ? resolve(workspace, JSON.parse(readFileSync(join(here, 'baseline-production-build.json'))).sourceRoot) : workspace;
const version = JSON.parse(readFileSync(join(root, 'node_modules/@ngne/core/package.json'))).version;
if (version !== (variant === 'baseline' ? '0.2.2' : '0.3.0')) throw Error('Unexpected engine version');
const { build } = await import(pathToFileURL(join(root, 'node_modules/vite/dist/node/index.js')));
await build({ root, configFile: false, base: './', logLevel: 'warn', plugins: [{
  name: 'migration-verification', enforce: 'pre', transform(code, id) {
    if (!id.replaceAll('\\', '/').endsWith('/tests/browser-campaign.ts')) return;
    if (!code.includes('canvas, ...VIEW, seed: 17,') || !code.includes('afterFrame(stats) {')) throw Error('Fixture instrumentation target changed');
    const pre = `let migrationPending; let migrationId = 0; const migrationScheduler = {request(callback) { migrationPending = callback; return ++migrationId; }, cancel() { migrationPending = undefined; }};\n`;
    code = code.replace('canvas, ...VIEW, seed: 17,', 'canvas, ...VIEW, scheduler: migrationScheduler, seed: 17,');
    return pre + code + `
const migrationPreparations = new Set();
const migrationPrepare = app.game.prepare.bind(app.game);
app.game.prepare = (...args) => {
  const pending = migrationPrepare(...args); migrationPreparations.add(pending);
  pending.then(() => migrationPreparations.delete(pending), () => migrationPreparations.delete(pending)); return pending;
};
window.__migration = {
  version: ${JSON.stringify(version)},
  async run() {
    campaign.reconcile();
    let timer;
    try { await Promise.race([Promise.all([...migrationPreparations]), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Asset preparation deadline')), 20000); })]); }
    finally { clearTimeout(timer); }
    for (let i = 1; i <= 1800; i++) {
      await new Promise(requestAnimationFrame);
      const callback = migrationPending; migrationPending = undefined;
      if (!callback) throw Error('Missing scheduled frame');
      callback(1000 + i * 1000 / 60);
    }
    let hash = 2166136261;
    const words = new Uint32Array(app.frame.data.buffer, app.frame.data.byteOffset, app.frame.count * 14);
    for (const word of words) hash = Math.imul(hash ^ word, 16777619);
    for (const index of app.frame.order) hash = Math.imul(hash ^ index, 16777619);
    const result = { version: ${JSON.stringify(version)}, seed: 17, width: canvas.width, height: canvas.height,
      tick: app.game.simulationTick, state: session.run, progress: app.game.state, history, errors,
      frameHash: (hash >>> 0).toString(16), frameCount: app.frame.count };
    await app.stop(); return result;
  }
};`;
  }
}], build: { outDir: join(workspace, '.test-output/ngne-030/browser', variant), emptyOutDir: false,
  rollupOptions: { input: { campaign: join(root, 'tests/browser-campaign.html') } }
}});
writeFileSync(join(here, `${variant}-browser-build.json`), JSON.stringify({ version, variant, seed: 17, frames: 1800, stepSeconds: 1 / 60,
  source: 'Existing tests/browser-campaign.ts with build-only public scheduler instrumentation; non-shipping fixture only; production smoke serves the separate npm build dist' }, null, 2) + '\n');
