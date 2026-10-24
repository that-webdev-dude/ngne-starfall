import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve, relative, join, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifiedProductionBuild } from './production-build.mjs';
const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../..');
const output = join(root, '.test-output/ngne-030');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const save = (name, value) => writeFileSync(join(here, name), JSON.stringify(value, null, 2) + '\n');
const flags = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--enable-unsafe-webgpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=960,540'];
async function connect(url) {
  const socket = new WebSocket(url), pending = new Map(), errors = []; let id = 0;
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails); if (message.method === 'Network.responseReceived' && message.params.response.status >= 400 && !message.params.response.url.endsWith('/favicon.ico')) errors.push(message.params.response); const task = pending.get(message.id); if (!task) return;
    pending.delete(message.id); clearTimeout(task.timer); message.error ? task.reject(Error(JSON.stringify(message.error))) : task.resolve(message.result); };
  socket.onclose = () => { for (const task of pending.values()) { clearTimeout(task.timer); task.reject(Error('CDP closed')); } pending.clear(); };
  return { socket, errors, send(method, params = {}, timeout = 45000) { return new Promise((resolve, reject) => {
    const key = ++id; const timer = setTimeout(() => { pending.delete(key); reject(Error('CDP deadline: ' + method)); }, timeout);
    pending.set(key, { resolve, reject, timer }); socket.send(JSON.stringify({ id: key, method, params }));
  }); }, async eval(expression, timeout) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, timeout);
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? JSON.stringify(result.exceptionDetails));
    return result.result.value;
  } };
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav' };
const productionBuilds = Object.fromEntries(['baseline', 'candidate'].map(variant => [variant, verifiedProductionBuild(variant)]));
const servedProductionFiles = [];
const server = createServer((req, res) => {
  try {
    const parts = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1).split('/');
    let base, variant, isProduction = false;
    if (parts[0] === 'fixture') {
      parts.shift(); variant = parts.shift();
      if (!['baseline', 'candidate'].includes(variant)) throw Error('Invalid fixture variant');
      base = resolve(output, 'browser', variant);
    } else {
      isProduction = true;
      if (parts[0] === 'production') { parts.shift(); variant = parts.shift(); }
      else variant = 'candidate';
      if (!productionBuilds[variant]) throw Error('Invalid production variant');
      base = productionBuilds[variant].root;
    }
    if (parts.includes('..')) throw Error('Invalid route');
    const name = parts.join('/') || 'index.html', file = resolve(base, name);
    if (!file.startsWith(base + sep)) throw Error('Outside build');
    const bytes = readFileSync(file);
    if (isProduction) servedProductionFiles.push({ url: req.url, variant, file: relative(root, file).split(sep).join('/'), sha256: createHash('sha256').update(bytes).digest('hex') });
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`, results = [];
async function browserJob(variant, work) {
  const profile = join(output, 'profiles', variant); mkdirSync(profile, { recursive: true });
  if (existsSync(join(profile, 'DevToolsActivePort'))) throw Error('Use a fresh browser profile');
  writeFileSync(join(here, `${variant}-browser.log`), '');
  const child = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=0`, `--user-data-dir=${profile}`, ...flags, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const launchError = new Promise((_, reject) => child.once('error', reject)); launchError.catch(() => {});
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => appendFileSync(join(here, `${variant}-browser.log`), data));
  let page, browser, primaryError; const cleanup = [];
  try {
    await Promise.race([launchError, (async () => { for (let i = 0; i < 200 && !existsSync(join(profile, 'DevToolsActivePort')); i++) await wait(100); })()]);
    const port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    page = await connect(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); browser = await connect(version.webSocketDebuggerUrl);
    await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: 1, mobile: false });
    save(`${variant}-browser-environment.json`, { node: process.version, browser: version.Browser, flags, viewport: { width: 960, height: 540, deviceScaleFactor: 1 }, gpu: await browser.send('SystemInfo.getInfo') });
    return await work(page);
  } catch (error) { primaryError = error; save(`${variant}-browser-failure.json`, { error: String(error), stack: error.stack }); throw error; }
  finally {
    if (browser) { try { await browser.send('Browser.close', {}, 5000); } catch (error) { cleanup.push({ step: 'Browser.close response', detail: String(error) }); } }
    page?.socket.close(); browser?.socket.close();
    for (let i = 0; i < 50 && child.exitCode === null; i++) await wait(100);
    if (child.exitCode === null) {
      const kill = spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { encoding: 'utf8', windowsHide: true });
      cleanup.push({ step: 'owned process termination', exitCode: kill.status });
      for (let i = 0; i < 30 && child.exitCode === null; i++) await wait(100);
    }
    const query = spawnSync('powershell.exe', ['-NoProfile', '-Command', `@(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*--user-data-dir=${profile.replaceAll("'", "''")}*' } | Where-Object { $_.ProcessId -ne $PID } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress`], { encoding: 'utf8', windowsHide: true });
    const pids = query.stdout.trim() ? JSON.parse(query.stdout) : [];
    let passed = query.status === 0 && child.exitCode !== null && (Array.isArray(pids) ? pids.length === 0 : !pids);
    cleanup.push({ step: 'owned profile process verification', passed, pids, queryExitCode: query.status, browserExitCode: child.exitCode, stderr: query.stderr });
    if (passed) {
      const profileRoot = resolve(output, 'profiles');
      const target = resolve(profile);
      if (!target.startsWith(profileRoot + sep) || !['baseline', 'candidate'].includes(variant)) throw Error('Unsafe profile cleanup path');
      try { rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); cleanup.push({ step: 'owned profile removal', passed: true }); }
      catch (error) { passed = false; cleanup.push({ step: 'owned profile removal', passed: false, error: String(error) }); }
    }
    save(`${variant}-browser-cleanup.json`, { passed, steps: cleanup });
    if (!passed && !primaryError) throw Error('Browser cleanup failed');
  }
}
async function until(read, accept, message) {
  for (let i = 0; i < 400; i++) { const value = await read(); if (accept(value)) return value; await wait(50); }
  throw Error(message);
}
async function productionSmoke(page, variant, routeName, url) {
  const firstResponse = servedProductionFiles.length;
  await page.send('Page.navigate', { url });
  const observe = () => page.eval('({ready:document.querySelector("canvas")?.dataset.ready,screen:document.querySelector("canvas")?.dataset.screen,label:document.querySelector("canvas")?.getAttribute("aria-label"),error:document.querySelector("#error")?.textContent,width:document.querySelector("canvas")?.width,height:document.querySelector("canvas")?.height})');
  const key = async (code, key, ms = 100) => { await page.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key }); await wait(ms); await page.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key }); };
  const screen = expected => until(observe, value => value.screen === expected, 'Expected screen ' + expected);
  await until(observe, value => value.ready === 'true', 'Production entrypoint did not become ready');
  if (await page.eval('Boolean(window.__migration)')) throw Error('Instrumented fixture served as production');
  const history = [await screen('title')];
  await key('Enter', 'Enter'); history.push(await screen('playing'));
  await key('Space', ' ', 250); await key('ArrowRight', 'ArrowRight', 250); await wait(250);
  const moved = await observe(); if (!moved.label?.includes('Position ') || moved.label.includes('Position 240.0,')) throw Error('Movement input did not change position');
  await key('Escape', 'Escape'); history.push(await screen('paused'));
  await key('Escape', 'Escape'); history.push(await screen('playing'));
  await key('Escape', 'Escape'); await screen('paused');
  for (let i = 0; i < 3; i++) await key('ArrowDown', 'ArrowDown');
  await key('Enter', 'Enter'); history.push(await screen('title'));
  const point = await page.eval('(() => { const r=document.querySelector("canvas").getBoundingClientRect(); return {x:r.left+r.width*240/480,y:r.top+r.height*184/270}; })()');
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }); await wait(100);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }); history.push(await screen('playing'));
  if (history.some(value => value.error || value.width !== 480 || value.height !== 270)) throw Error('Production smoke diagnostics or dimensions failed');
  writeFileSync(join(here, `${variant}-production${routeName === 'root' ? '-root' : ''}.png`), Buffer.from((await page.send('Page.captureScreenshot')).data, 'base64'));
  await page.send('Page.navigate', { url: 'about:blank' }); // Runs production pagehide disposal before closing Chrome.
  if (page.errors.length) throw Error('Browser exceptions or failed resources: ' + JSON.stringify(page.errors));

  const responses = servedProductionFiles.slice(firstResponse);
  const expectedIndex = productionBuilds[variant].manifest.outputRoot + '/index.html';
  if (!responses.some(response => response.file === expectedIndex) || !responses.some(response => response.file.endsWith('.js'))) throw Error('Production artifacts were not served');
  return { routeName, url: new URL(url).pathname, screens: history, movement: moved, keyboardFire: 'Space held 250ms; no diagnostics', pointerLaunch: true, servedFiles: responses };
}
try {
  for (const variant of ['baseline', 'candidate']) {
    console.log('START browser ' + variant);
    const result = await browserJob(variant, async page => {
      await page.send('Page.navigate', { url: `${origin}/fixture/${variant}/tests/browser-campaign.html` });
      await until(() => page.eval('Boolean(window.__migration)'), Boolean, 'Fixture did not start');
      const campaign = await page.eval('window.__migration.run()', 120000);
      if (campaign.version !== (variant === 'baseline' ? '0.2.2' : '0.3.0') || campaign.errors.length || campaign.tick !== 1799 || campaign.width !== 480 || campaign.height !== 270) throw Error('Browser fixture failed');
      const png = Buffer.from((await page.send('Page.captureScreenshot')).data, 'base64');
      writeFileSync(join(here, `${variant}-frame.png`), png);
      const framePngSha256 = createHash('sha256').update(png).digest('hex');
      const smokes = [await productionSmoke(page, variant, 'nested', `${origin}/production/${variant}/`)];
      if (variant === 'candidate') smokes.push(await productionSmoke(page, variant, 'root', origin + '/'));
      return { variant, campaign, framePngSha256, browserErrors: page.errors,
        production: { artifact: productionBuilds[variant].manifest, smokes } };
    });
    save(`${variant}-browser.json`, result); results.push(result); console.log('DONE browser ' + variant);
  }
  const comparable = ({ version, ...value }) => value;
  const exactCampaignMatch = JSON.stringify(comparable(results[0].campaign)) === JSON.stringify(comparable(results[1].campaign));
  const exactFramePngMatch = results[0].framePngSha256 === results[1].framePngSha256;
  save('browser-comparison.json', { exactCampaignMatch, exactFramePngMatch, results, limitations: ['1800 rendered fixture frames with synthetic fixed-step timestamps and real requestAnimationFrame pacing; not a performance benchmark or a complete rendered campaign.', 'Headless Chrome on one Windows machine; no human visual/audio or physical controller acceptance.'] });
  if (!exactCampaignMatch || !exactFramePngMatch) throw Error('Browser baseline/candidate mismatch');
  for (const variant of ['baseline', 'candidate']) {
    const current = verifiedProductionBuild(variant);
    if (JSON.stringify(current.manifest) !== JSON.stringify(productionBuilds[variant].manifest)) throw Error('Production build manifest changed during browser validation');
  }
  save('production-dist-validation.json', { accepted: true, source: 'Actual npm.cmd run build outputs using vite.config.ts; artifact inventories checked before and after browser execution',
    builds: results.map(result => ({ variant: result.variant, artifact: result.production.artifact, smokes: result.production.smokes })), servedProductionFiles });
} finally { await new Promise(resolve => server.close(resolve)); }
