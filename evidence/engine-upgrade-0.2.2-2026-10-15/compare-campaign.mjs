import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url)),game=resolve(here,'../..'),results=[];
for(const [variant,root] of [['baseline',join(here,'baseline-work')],['candidate',game]]) {
 const output=join(here,`${variant}-campaign.json`),result=spawnSync(process.execPath,['--experimental-strip-types','tests/run-campaign-bot.ts',output,'17','41','83'],{cwd:root,encoding:'utf8',windowsHide:true,timeout:180000});
 writeFileSync(join(here,`${variant}-campaign.log`),result.stdout+'\n'+result.stderr);
 if(result.status!==0)throw Error(`${variant} bot failed ${result.error??result.stderr}`);
 const value=JSON.parse(readFileSync(output,'utf8'));if(value.results.some(v=>v.outcome!=='campaign-clear'||v.diagnostics.length))throw Error('Campaign acceptance failed');results.push({variant,version:JSON.parse(readFileSync(join(root,'node_modules/@ngne/core/package.json'),'utf8')).version,value});
 console.log(variant+' all three campaigns cleared');
}
const exact=JSON.stringify(results[0].value.results)===JSON.stringify(results[1].value.results);writeFileSync(join(here,'campaign-comparison.json'),JSON.stringify({seed:[17,41,83],exactResults:exact,results},null,2)+'\n');if(!exact)throw Error('Campaign results differ');
