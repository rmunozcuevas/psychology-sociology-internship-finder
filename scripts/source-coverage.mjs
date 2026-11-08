import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {postingKey} from './posting-key.mjs';
import {cityCoverage} from '../student-tools.mjs';
const root=new URL('../',import.meta.url);
const read=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
const [health,psychology,sociology,registry,discovered]=await Promise.all(['source-health.json','opportunities.json','sociology-opportunities.json','employer-boards.json','discovered-boards.json'].map(read));
const definitions=new Map();
for(const [kind,boards] of Object.entries(registry))if(Array.isArray(boards))for(const b of boards)definitions.set(`${kind}:${b.id}`,{...b,kind});
for(const b of discovered.boards||[])if(!definitions.has(`${b.kind}:${b.id}`))definitions.set(`${b.kind}:${b.id}`,b);
const reports=new Map(health.sources.map(r=>[`${r.kind}:${r.id}`,r]));
if(psychology.communityCoverage?.status==='ok'||psychology.communityCoverage?.status==='error')reports.set('community:searchtern',{kind:'community',id:'searchtern',...psychology.communityCoverage,scanned:psychology.communityCoverage.observedCandidates||0});
const unique=new Map();
for(const [discipline,feed] of Object.entries({psychology,sociology}))for(const r of feed.roles){
 const key=postingKey(r.url),existing=unique.get(key);
 if(existing){existing.disciplines.push(discipline);continue;}
 unique.set(key,{...r,id:key,disciplines:[discipline]});
}
const jobs=[...unique.values()];
const retained=(job,report)=>report.status!=='ok'&&(!report.startedAt||Date.parse(job.lastSeen||0)<Date.parse(report.startedAt));
for(const job of jobs)if(!reports.has(job.sourceId||'unattributed'))reports.set(job.sourceId||'unattributed',{kind:'unattributed',id:job.sourceId||'unattributed',status:'unknown'});
const sources=[...reports.entries()].map(([key,r])=>{
 const definition=definitions.get(key)||{},rows=jobs.filter(j=>(j.sourceId||'unattributed')===key),interns=rows.filter(j=>j.opportunityKind==='internship');
 return {key,kind:r.kind,name:definition.employer||(key==='community:searchtern'?'SearchTern community index':r.id),url:definition.url||null,status:r.status,checkedAt:r.checkedAt||health.updatedAt,error:r.error||null,scanned:r.scanned||0,internships:interns.length,focused:interns.filter(j=>j.careerPath!=='Broader management / leadership').length,broader:interns.filter(j=>j.careerPath==='Broader management / leadership').length,entryLevel:rows.length-interns.length,retained:rows.filter(job=>retained(job,r)).length,psychology:rows.filter(j=>j.disciplines.includes('psychology')).length,sociology:rows.filter(j=>j.disciplines.includes('sociology')).length};
}).sort((a,b)=>b.focused-a.focused||b.internships-a.internships||a.name.localeCompare(b.name));
const report={updatedAt:health.updatedAt,generatedAt:new Date().toISOString(),methodology:'Unique application URLs across both disciplines. Screened candidates are not guarantees of eligibility. Failed-source carryovers are counted separately. Community results require employer review. Initial database import is a baseline, not newly discovered jobs.',summary:{sources:sources.length,working:sources.filter(s=>s.status==='ok').length,productive:sources.filter(s=>s.internships>0&&s.status==='ok').length,failed:sources.filter(s=>s.status!=='ok').length,internships:jobs.filter(j=>j.opportunityKind==='internship').length,focused:jobs.filter(j=>j.opportunityKind==='internship'&&j.careerPath!=='Broader management / leadership').length,entryLevel:jobs.filter(j=>j.opportunityKind==='entry-level').length,retained:sources.reduce((n,s)=>n+s.retained,0)},disciplines:{psychology:psychology.counts,sociology:sociology.counts},cities:{psychology:cityCoverage(psychology.roles,Date.now(),true),sociology:cityCoverage(sociology.roles,Date.now(),true)},sources};
await mkdir(new URL('api/',root),{recursive:true});
await mkdir(new URL('data/',root),{recursive:true});
// SQLite stores public job identifiers and observations, never resumes or application notes.
const result=spawnSync('python3',[fileURLToPath(new URL('coverage-db.py',import.meta.url))],{input:JSON.stringify({report,jobs:jobs.map(j=>({id:j.id,sourceId:j.sourceId||'unattributed',title:j.title,org:j.org,url:j.url,location:j.location,kind:j.opportunityKind,lastSeen:j.lastSeen,disciplines:j.disciplines}))}),encoding:'utf8',maxBuffer:10*1024*1024});
if(result.status!==0)throw Error(result.stderr||'Coverage database failed');
const history=JSON.parse(result.stdout);
await writeFile(new URL('api/source-coverage.json',root),JSON.stringify({...report,...history},null,2)+'\n');
console.log(JSON.stringify({...report.summary,history:history.history.length,changes:history.changes}));
