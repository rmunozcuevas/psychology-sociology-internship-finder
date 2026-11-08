// Merge supplemental scans by source observation, replacing rows from a completed newer scan.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {listingStatus} from '../listing-quality.mjs';
import {postingKey} from './posting-key.mjs';
import {sociologyFeed} from './sociology.mjs';
const directories=process.argv.slice(2);if(!directories.length)throw Error('Pass completed snapshot directories');
const read=async(dir,name)=>JSON.parse(await readFile(resolve(dir,name),'utf8'));
const snapshots=await Promise.all(directories.map(async dir=>({health:await read(dir,'source-health.json'),psych:await read(dir,'opportunities.json'),socio:await read(dir,'sociology-opportunities.json')})));
const sourceKey=r=>`${r.kind}:${r.id}`;
const migrate=id=>id?.replace('workday:aah.wd5.myworkdayjobs.com|aah|external','workday:aah.wd115.myworkdayjobs.com|aah|External');
const sources=new Map();
for(const [index,snapshot] of snapshots.entries())for(const r of snapshot.health.sources){const key=migrate(sourceKey(r)),checkedAt=r.checkedAt||snapshot.health.updatedAt,old=sources.get(key);if(!old||Date.parse(checkedAt)>=Date.parse(old.checkedAt))sources.set(key,{...r,checkedAt,index});}
function merge(field){const rows=new Map();for(const [index,snapshot] of snapshots.entries())for(const r of snapshot[field].roles){const report=sources.get(migrate(r.sourceId));if(report?.status==='ok'&&report.index!==index)continue;if(listingStatus(r).state==='closed')continue;const key=postingKey(r.url),old=rows.get(key);if(old&&old.verification!=='community-index'&&r.verification==='community-index')continue;rows.set(key,{...r,id:key});}return [...rows.values()];}
const reports=[...sources.values()].map(({index,...r})=>r),updatedAt=new Date().toISOString();
const sourceCoverage={configured:reports.length,healthy:reports.filter(r=>r.status==='ok').length,failed:reports.filter(r=>r.status!=='ok').length,scannedPostings:reports.reduce((n,r)=>n+(r.scanned||0),0)};
const roles=merge('psych'),interns=roles.filter(r=>r.opportunityKind==='internship');
const counts={internships:interns.length,focused:interns.filter(r=>r.careerPath!=='Broader management / leadership').length,broaderManagement:interns.filter(r=>r.careerPath==='Broader management / leadership').length,employerFeedInternships:interns.filter(r=>r.verification!=='community-index').length,communityInternshipCandidates:interns.filter(r=>r.verification==='community-index').length,entryLevel:roles.filter(r=>r.opportunityKind==='entry-level').length};
const errors=reports.filter(r=>r.status!=='ok').map(r=>`${r.kind} ${r.id}: ${r.error||'partial scan'}`);
const psych={...snapshots[0].psych,updatedAt,lastAttemptAt:updatedAt,sourceCoverage,counts,roles,total:roles.length,errors};
const sociologyRules=await read('.', 'sociology-rules.json');
const socio=sociologyFeed(merge('socio'),sociologyRules,{...snapshots[0].socio,updatedAt,sourceCoverage,errors});
for(const [name,data] of Object.entries({'opportunities.json':psych,'sociology-opportunities.json':socio,'source-health.json':{updatedAt,...sourceCoverage,sources:reports}}))await writeFile(new URL('../'+name,import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({psychology:counts,sociology:socio.counts,sourceCoverage}));
