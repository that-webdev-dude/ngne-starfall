import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),game=resolve(here,'../..'),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const original=JSON.parse(readFileSync(join(here,'baseline-files.json'),'utf8').replace(/^\uFEFF/,'')),changed=[],unchanged=[];
for(const row of original){const file=join(game,row.path);try{if(sha(file)===row.sha256)unchanged.push(row.path);else changed.push(row.path);}catch{changed.push(row.path+' (removed)');}}
const protectedChanges=changed.filter(p=>!['package.json','package-lock.json','README.md'].includes(p)&&!p.startsWith('dist/'));
const baseline=join(here,'baseline-work'),sourceFiles=original.filter(r=>r.path.startsWith('src/')||r.path.startsWith('tests/')||r.path.startsWith('public/'));
const sourceMatch=sourceFiles.every(r=>sha(join(game,r.path))===r.sha256&&sha(join(baseline,r.path))===r.sha256);
const historicalFiles=original.filter(r=>r.path.startsWith('artifacts/')||r.path.startsWith('art/')||r.path==='GAMEDEV-REPORT.md'||r.path==='gamedevs-state.json');
const result={created:new Date().toISOString(),originalFiles:original.length,unchangedOriginalFiles:unchanged.length,changedOriginalFiles:changed,protectedChanges,sourceAssetTestFiles:sourceFiles.length,sameSourceAssetTestFiles:sourceMatch,historicalEvidenceFiles:historicalFiles.length,historicalEvidenceUnchanged:historicalFiles.every(r=>sha(join(game,r.path))===r.sha256),baselineArchive:{sha256:sha(join(here,'baseline-0.2.1.zip')),expected:'ff10dbfb9647fc0b7cd5bf0a10929aa77362d5bea1c39f20303ca6f982af0ecc'},installedVersion:JSON.parse(readFileSync(join(game,'node_modules/@ngne/core/package.json'),'utf8')).version};
writeFileSync(join(here,'integrity.json'),JSON.stringify(result,null,2)+'\n');if(protectedChanges.length||!sourceMatch||!result.historicalEvidenceUnchanged||result.baselineArchive.sha256!==result.baselineArchive.expected)throw Error('Integrity mismatch');console.log(JSON.stringify(result));
const files=[];function walk(root){for(const entry of readdirSync(root,{withFileTypes:true})){const p=join(root,entry.name);if(entry.isDirectory()){if(entry.name==='node_modules')continue;walk(p);}else if(relative(here,p)!=='SHA256SUMS')files.push(p);}}walk(here);writeFileSync(join(here,'SHA256SUMS'),files.sort().map(p=>`${sha(p)}  ${relative(here,p).replaceAll('\\','/')}`).join('\n')+'\n');console.log('Checksummed '+files.length+' evidence files excluding regenerable baseline node_modules');
