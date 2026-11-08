import { listingStatus } from '../listing-quality.mjs';
import { sociologyRecord, sociologyFeed, sociologyRelevance } from './sociology.mjs';
import { TERMS, NOT_INTERN, OUT_OF_SCOPE, plain, classify as classifyRole } from './relevance.mjs';
import { postingKey } from './posting-key.mjs';
import { communityJobs } from './community.mjs';
import { smartRecruiterJobs } from './smartrecruiters.mjs';
import { refreshLocalPrograms } from './local-programs.mjs';
import { jibeJobs } from './jibe.mjs';
import { workdayJobs } from './workday.mjs';
import { opportunityKind, careerPath } from '../eligibility.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const sociologyRules=JSON.parse(await readFile(new URL('../sociology-rules.json',import.meta.url),'utf8'));
const eligibilityRules = JSON.parse(await readFile(new URL('../opportunity-rules.json', import.meta.url), 'utf8'));
const outputArg=process.argv.find(a=>a.startsWith('--output-dir='))?.slice('--output-dir='.length);
const OUTPUT_ROOT=outputArg?pathToFileURL(resolve(outputArg)+'/'):new URL('../',import.meta.url);
await mkdir(OUTPUT_ROOT,{recursive:true});
const OUT = new URL('opportunities.json',OUTPUT_ROOT);
const providerArg=process.argv.find(a=>a.startsWith('--providers='))?.slice('--providers='.length);
const selectedProviders=new Set((providerArg||'greenhouse,lever,ashby,workday,smartrecruiters,bamboohr,jibe,community').split(','));
const SKILLS = ['Research methods','Data analysis','Child development','Empathy','Documentation','Teamwork','Survey design','Communication','Outreach','Writing','Interviewing','Neuroscience'];
const SOURCES = [
  {name:'Greenhouse public career boards', url:'https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true', kind:'greenhouse'},
  {name:'Lever public postings', url:'https://api.lever.co/v0/postings/{site}?mode=json', kind:'lever'},
  {name:'Ashby public job boards', url:'https://api.ashbyhq.com/posting-api/job-board/{board}', kind:'ashby'}
];
// The checked-in registry is always included; repository variables add extra boards.
const registryArg=process.argv.find(a=>a.startsWith('--registry='))?.slice('--registry='.length);
const registry = JSON.parse(await readFile(registryArg||new URL('../employer-boards.json', import.meta.url), 'utf8'));
const discovered=process.argv.includes('--manual-only')?{boards:[]}:JSON.parse(await readFile(new URL('../discovered-boards.json',import.meta.url),'utf8').catch(()=>'{"boards":[]}'));
const replacedBoards=new Set(Object.values(registry).filter(Array.isArray).flatMap(boards=>boards.flatMap(b=>b.replaces||[])));
for(const board of discovered.boards||[]){if(replacedBoards.has(board.id))continue;const list=registry[board.kind]??=[];if(!list.some(b=>b.id===board.id))list.push(board);}
const sourceReports=[];
const extendMode=process.argv.includes('--extend');
const previousHealth=extendMode?JSON.parse(await readFile(new URL('source-health.json',OUTPUT_ROOT),'utf8').catch(()=>'{"sources":[]}')):{sources:[]};
if(extendMode && (!previousHealth.updatedAt || Date.now()-Date.parse(previousHealth.updatedAt)>6*3600000))throw Error('--extend requires a full collection completed within the last six hours');
const reuseSources=new Map(previousHealth.sources.filter(r=>r.status==='ok').map(r=>[`${r.kind}:${r.id}`,r]));
async function parallel(items,limit,fn){let next=0;await Promise.all(Array.from({length:limit},async()=>{while(next<items.length)await fn(items[next++]);}));}
async function source(kind,id,fn){
const startedAt=new Date().toISOString();
if(extendMode && reuseSources.has(`${kind}:${id}`)){sourceReports.push({...reuseSources.get(`${kind}:${id}`),reused:true});return;}
try{const count=await fn();sourceReports.push({kind,id,status:'ok',scanned:count,startedAt,checkedAt:new Date().toISOString()});if(sourceReports.length%50===0)console.log(`Checked ${sourceReports.length} employer feeds; ${roles.filter(r=>r.opportunityKind==='internship').length} internship candidates so far.`);}catch(e){errors.push(`${kind} ${id}: ${e.message}`);sourceReports.push({kind,id,status:'error',error:e.message,startedAt,checkedAt:new Date().toISOString()});}}
const configured = (kind, variable) => selectedProviders.has(kind)?[...new Set([...(registry[kind] || []).map(b => b.id), ...(process.env[variable] || '').split(',').map(s => s.trim()).filter(Boolean)])]:[];
const employerName = (kind, id) => registry[kind]?.find(b => b.id === id)?.employer || id;
const boards = configured('greenhouse', 'GREENHOUSE_BOARDS');
const leverSites = configured('lever', 'LEVER_SITES');
const ashbyBoards = configured('ashby', 'ASHBY_BOARDS');
const smartRecruiters = configured('smartrecruiters', 'SMARTRECRUITERS_COMPANIES');
const bambooBoards = configured('bamboohr', 'BAMBOOHR_BOARDS');
const jibeBoards = configured('jibe','JIBE_BOARDS');
const workdayBoards = configured('workday', 'WORKDAY_BOARDS');
const discoverBoards = process.env.DISCOVER_ATS_BOARDS === 'true';
const employerDirectory=JSON.parse(await readFile(new URL('../employer-directory.json',import.meta.url),'utf8').catch(()=>'{"psychologyFirst":[],"largeEmployers":[]}'));
const old = JSON.parse(await readFile(OUT, 'utf8').catch(()=>'{"roles":[]}'));
const oldSociology=JSON.parse(await readFile(new URL('sociology-opportunities.json',OUTPUT_ROOT),'utf8').catch(()=>'{"roles":[]}'));
const sociologyInputs=extendMode?oldSociology.roles.filter(r=>r.sourceId&&reuseSources.has(r.sourceId)):[];
const roles = extendMode ? old.roles.filter(r=>r.sourceId && reuseSources.has(r.sourceId)) : [];
const errors = [];
const discoveredBoardCounts={greenhouse:0,lever:0,ashby:0};
async function get(url, opts={}) { const res=await fetch(url,{...opts,signal:AbortSignal.timeout(18000),headers:{'user-agent':'FieldnoteInternshipFinder/1.0 contact=project-maintainer',...opts.headers}});if(!res.ok)throw new Error(`${res.status} ${url}`);return res.json(); }
function classify(title,text,preview=false){return classifyRole(title,text,eligibilityRules,preview);}
function skills(text){const s=text.toLowerCase();return SKILLS.filter(k=>s.includes(k.toLowerCase())||({ 'Data analysis':['spss','statistics','excel','r studio'],'Research methods':['qualitative','quantitative','participant'],'Empathy':['client support','patient care'],'Survey design':['qualtrics','questionnaire'],'Child development':['pediatric','youth']}[k]||[]).some(x=>s.includes(x)));}
function season(text) { if (/spring internship/i.test(text)&&/2027/.test(text)) return 'Spring 2027'; return /summer\s*(?:'|’)?\s*2027|2027\s+summer/i.test(text)?'Summer 2027':/spring\s*(?:'|’)?\s*2027/i.test(text)?'Spring 2027':'Season not specified'; }
function add({title,company,location='',url='',description='',date='',dateUpdated=null,deadline=null,source='',originBoard='',verification='employer-api',observedAt=null}) { const cleanTitle=plain(title);const cleanDescription=plain(description);
if(TERMS.test(cleanTitle)||new RegExp(sociologyRules.entryTitle,'i').test(cleanTitle)){
 const sociology=sociologyRecord({title:cleanTitle,description:cleanDescription,org:company,location,url,datePosted:date,dateUpdated,deadline,source,sourceId:originBoard,verification,observedAt,lastSeen:new Date().toISOString(),firstSeen:oldSociology.roles?.find(r=>postingKey(r.url)===postingKey(url))?.firstSeen||new Date().toISOString().slice(0,10),season:season(cleanTitle)!=='Season not specified'?season(cleanTitle):season(`${cleanTitle} ${cleanDescription}`)},sociologyRules);
 if(sociology)sociologyInputs.push(sociology);
}
const type=classify(cleanTitle,cleanDescription);const kind=opportunityKind(cleanTitle,cleanDescription,eligibilityRules);if(!type||!url||!kind||/\b(?:spring|summer|fall|autumn|winter)\s*202[0-6]\b|\b202[0-6]\s*(?:spring|summer|fall|autumn|winter)\b/i.test(cleanTitle))return;const key=postingKey(url);if(roles.some(r=>r.id===key))return;roles.push({id:key,careerPath:careerPath(cleanTitle,eligibilityRules),opportunityKind:kind,title:cleanTitle,org:plain(company),location:plain(location),type,source,sourceId:originBoard,verification,observedAt,url,deadline,description:cleanDescription.slice(0,12000),skills:skills(`${cleanTitle} ${cleanDescription}`),lastSeen:new Date().toISOString(),firstSeen:old.roles?.find(r=>postingKey(r.url)===key)?.firstSeen||new Date().toISOString().slice(0,10),datePosted:date||null,dateUpdated,season:season(cleanTitle)!=='Season not specified'?season(cleanTitle):season(`${cleanTitle} ${cleanDescription}`)}); }
await parallel(boards,8,token=>source('greenhouse',token,async()=>{
 const data=await get(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`);
 if(!Array.isArray(data.jobs))throw Error('Invalid jobs response');
 for(const j of data.jobs)add({title:j.title,company:j.company_name||employerName('greenhouse',token),location:j.location?.name||'',url:j.absolute_url,description:j.content||'',date:null,dateUpdated:j.updated_at||null,source:'Greenhouse',originBoard:`greenhouse:${token}`});return data.jobs.length;
}));
await parallel(leverSites,6,site=>source('lever',site,async()=>{
 const data=await get(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`);if(!Array.isArray(data))throw Error('Invalid jobs response');
 for(const j of data)add({title:j.text,company:employerName('lever',site),location:j.categories?.location||'',url:j.hostedUrl,description:[j.descriptionPlain||j.description||'',...(j.lists||[]).map(l=>l.text+' '+l.content)].join(' '),date:j.createdAt?new Date(j.createdAt).toISOString():null,source:'Lever',originBoard:`lever:${site}`});return data.length;
}));
await parallel(ashbyBoards,6,board=>source('ashby',board,async()=>{
 const data=await get(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`);if(!Array.isArray(data.jobs))throw Error('Invalid jobs response');
 for(const j of data.jobs)add({title:j.title,company:employerName('ashby',board),location:j.location||'',url:j.jobUrl,description:j.descriptionPlain||j.descriptionHtml||'',date:j.publishedAt,source:'Ashby',originBoard:`ashby:${board}`});return data.jobs.length;
}));
if (discoverBoards) {
  const ccIndex='https://index.commoncrawl.org/CC-MAIN-2026-42-index';
  const employers=[...employerDirectory.psychologyFirst,...employerDirectory.largeEmployers];
  for(const employer of employers){let confirmed=false;const candidates=[];for(const [kind,slug] of Object.entries(employer.boards||{}))candidates.push({kind,slug});if(!candidates.length)for(const pattern of employer.atsPatterns||[]){try{const u=new URL(ccIndex);u.searchParams.set('url',pattern);u.searchParams.set('output','json');u.searchParams.set('filter','status:200');u.searchParams.set('collapse','urlkey');const response=await fetch(u,{signal:AbortSignal.timeout(12000),headers:{'user-agent':'FieldnoteInternshipFinder/1.0'}});if(!response.ok)continue;const rows=(await response.text()).split('\n').filter(Boolean).map(line=>JSON.parse(line));const kind=pattern.includes('greenhouse')?'greenhouse':pattern.includes('lever')?'lever':'ashby';for(const slug of new Set(rows.map(row=>new URL(row.url).pathname.split('/').filter(Boolean)[0]).filter(s=>/^[a-z0-9][a-z0-9.-]{1,60}$/i.test(s))))candidates.push({kind,slug})}catch{}}for(const {kind,slug} of candidates){try{let data;if(kind==='greenhouse')data=await get(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`);else if(kind==='lever')data=await get(`https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`);else data=await get(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`);const jobs=kind==='lever'?data:(data.jobs||[]);let found=false;for(const j of jobs){const before=roles.length;if(kind==='greenhouse')add({title:j.title,company:j.company_name||employer.name,location:j.location?.name||'',url:j.absolute_url,description:j.content||'',date:null,dateUpdated:j.updated_at||null,source:'Greenhouse'});else if(kind==='lever')add({title:j.text,company:j.categories?.team||employer.name,location:j.categories?.location||'',url:j.hostedUrl,description:[j.descriptionPlain||j.description||'', ...(j.lists||[]).map(l=>l.text+' '+l.content)].join(' '),date:j.createdAt?new Date(j.createdAt).toISOString():null,source:'Lever'});else add({title:j.title,company:employer.name,location:j.location||'',url:j.jobUrl,description:j.descriptionPlain||j.descriptionHtml||'',date:j.publishedAt,source:'Ashby'});if(roles.length>before)found=true}if(found){discoveredBoardCounts[kind]++;confirmed=true}}catch{}}if(!confirmed)errors.push(`No verified public ATS board found for ${employer.name}`)}
}
const smartRecruiterStats=[];
for (const company of smartRecruiters) try {
  if(extendMode && reuseSources.has(`smartrecruiters:${company}`)){sourceReports.push({...reuseSources.get(`smartrecruiters:${company}`),reused:true});continue;}
  const result=await smartRecruiterJobs(company,get,title=>TERMS.test(title)&&Boolean(classify(title,'',true)||sociologyRelevance(title,'',sociologyRules,{preview:true})));
  for(const job of result.jobs)add({...job,originBoard:`smartrecruiters:${company}`});
  errors.push(...result.errors);
  sourceReports.push({kind:'smartrecruiters',id:company,status:result.errors.length?'partial':'ok',scanned:result.scanned,checkedAt:new Date().toISOString(),error:result.errors.join('; ').slice(0,1000)||null});
  smartRecruiterStats.push({board:company,scanned:result.scanned,detailFetched:result.jobs.length,errors:result.errors.length});
} catch(e) {errors.push(`SmartRecruiters ${company}: ${e.message}`);sourceReports.push({kind:'smartrecruiters',id:company,status:'error',error:e.message,checkedAt:new Date().toISOString()})}
await parallel(bambooBoards,4,board=>source('bamboohr',board,async()=>{const data=await get(`https://${encodeURIComponent(board)}.bamboohr.com/careers/list`);if(!Array.isArray(data.result))throw Error('Invalid BambooHR jobs response');for(const j of data.result)add({title:j.jobOpeningName,company:j.departmentLabel||board,location:j.location?.city||j.location?.state||'',url:`https://${board}.bamboohr.com/careers/${j.id}`,description:j.jobOpeningDescription||'',date:j.datePosted,source:'BambooHR',originBoard:`bamboohr:${board}`});return data.result.length;}));
const workdayStats=[];
let nextWorkday=0;
await Promise.all(Array.from({length:6},async()=>{
while(nextWorkday<workdayBoards.length) {
const raw=workdayBoards[nextWorkday++];
const startedAt=new Date().toISOString();
if(extendMode && reuseSources.has(`workday:${raw}`)){sourceReports.push({...reuseSources.get(`workday:${raw}`),reused:true});continue;}
try {
  const board=registry.workday?.find(b=>b.id===raw);
  const result=await workdayJobs(raw,get,title=>(board?.fetchInternshipDetails&&/\bintern(?:ship)?\b/i.test(title))||((TERMS.test(title)||new RegExp(sociologyRules.entryTitle,'i').test(title))&&Boolean(classify(title,'',true)||sociologyRelevance(title,'',sociologyRules,{preview:true}))),board?.searches);
  for(const job of result.jobs)add({...job,company:employerName('workday',raw),originBoard:`workday:${raw}`});
  errors.push(...result.errors.map(e=>`Workday ${raw}: ${e}`));
  sourceReports.push({kind:'workday',id:raw,status:result.errors.length?'partial':'ok',scanned:result.scanned,startedAt,checkedAt:new Date().toISOString(),error:result.errors.join('; ').slice(0,1000)||null});
  workdayStats.push({board:raw,scanned:result.scanned,detailFetched:result.jobs.length,errors:result.errors.length});
} catch(e) {errors.push(`Workday ${raw}: ${e.message}`);sourceReports.push({kind:'workday',id:raw,status:'error',error:e.message,startedAt,checkedAt:new Date().toISOString()})}
}
}));
await parallel(jibeBoards,3,id=>source('jibe',id,async()=>{const board=registry.jibe.find(b=>b.id===id);if(!board)throw Error('Jibe board requires registry definition');const result=await jibeJobs(board,get);for(const job of result.jobs)add({...job,originBoard:`jibe:${id}`});return result.scanned;}));
let communityCoverage={status:'not-requested'};
try{if(selectedProviders.has('community')){const jobs=await communityJobs(get);for(const job of jobs)add({...job,originBoard:'community:searchtern'});communityCoverage={status:'ok',checkedAt:new Date().toISOString(),observedCandidates:jobs.length};}}catch(e){errors.push(`Community index: ${e.message}`);communityCoverage={status:'error',error:e.message};}
if(!outputArg)await refreshLocalPrograms();
const failedSources=new Set(sourceReports.filter(r=>r.status!=='ok').map(r=>`${r.kind}:${r.id}`));
if(communityCoverage.status==='error')failedSources.add('community:searchtern');
const retained=(old.roles||[]).filter(r=>failedSources.has(r.sourceId)).filter(r=>r.verification!=='community-index'||Date.parse(r.observedAt||0)>=Date.now()-14*86400000).map(oldRole=>{const description=plain(oldRole.description);return {...oldRole,title:plain(oldRole.title),org:plain(oldRole.org),description,careerPath:careerPath(oldRole.title,eligibilityRules),opportunityKind:opportunityKind(oldRole.title,description,eligibilityRules),type:classify(oldRole.title,description),season:season(`${oldRole.title} ${description}`)}}).filter(oldRole=>oldRole.opportunityKind&&oldRole.type&&Date.parse(oldRole.lastSeen||oldRole.firstSeen||0)>Date.now()-7*86400000&&!roles.some(r=>r.url.split('?')[0]===oldRole.url.split('?')[0]));
const merged=[...new Map([...retained,...roles].map(r=>[postingKey(r.url),r])).values()].map(r=>({...r,opportunityKind:opportunityKind(r.title,r.description||'',eligibilityRules),type:classify(r.title,r.description||''),careerPath:careerPath(r.title,eligibilityRules)})).filter(r=>r.opportunityKind&&r.type&&listingStatus(r).state!=='closed').sort((a,b)=>(a.opportunityKind==='internship'?0:1)-(b.opportunityKind==='internship'?0:1)||(a.type==='psychology'?-1:1)-(b.type==='psychology'?-1:1)||a.title.localeCompare(b.title));
const sourceCoverage={configured:sourceReports.length,healthy:sourceReports.filter(r=>r.status==='ok').length,failed:sourceReports.filter(r=>r.status!=='ok').length,reused:sourceReports.filter(r=>r.reused).length,scannedPostings:sourceReports.reduce((sum,r)=>sum+(r.scanned||0),0)};
await writeFile(new URL('source-health.json',OUTPUT_ROOT),JSON.stringify({updatedAt:new Date().toISOString(),...sourceCoverage,sources:sourceReports},null,2)+'\n');
const internshipRows=merged.filter(r=>r.opportunityKind==='internship');
const counts={internships:internshipRows.length,focused:internshipRows.filter(r=>r.careerPath!=='Broader management / leadership').length,broaderManagement:internshipRows.filter(r=>r.careerPath==='Broader management / leadership').length,employerFeedInternships:internshipRows.filter(r=>r.verification!=='community-index').length,communityInternshipCandidates:internshipRows.filter(r=>r.verification==='community-index').length,entryLevel:merged.filter(r=>r.opportunityKind==='entry-level').length};
const successfulRefresh=roles.length>0||!errors.length;
await writeFile(OUT,JSON.stringify({updatedAt:successfulRefresh?new Date().toISOString():old.updatedAt||null,lastAttemptAt:new Date().toISOString(),source:'Employer APIs and separately labeled community index',counts,communityCoverage,selectedProviders:[...selectedProviders],sourceCoverage,workdayStats,smartRecruiterStats,total:merged.length,refreshed:roles.length,discoveredBoardCounts,configuredBoardCounts:Object.fromEntries(['greenhouse','lever','ashby','smartrecruiters','bamboohr','workday','jibe'].map(k=>[k,registry[k]?.length||0])),roles:merged,errors},null,2)+'\n');
console.log(`Refresh complete: ${roles.length} fresh relevant roles, ${merged.length} total, ${errors.length} source errors.`);
if(!selectedProviders.has('community')&&!boards.length&&!leverSites.length&&!ashbyBoards.length&&!smartRecruiters.length&&!bambooBoards.length&&!workdayBoards.length&&!jibeBoards.length)console.log('No source configuration found. Set ATS board variables to expand coverage.');

const retainedSociology=oldSociology.roles.filter(r=>failedSources.has(r.sourceId)&&Date.parse(r.lastSeen||r.firstSeen||0)>Date.now()-7*86400000).filter(r=>r.verification!=='community-index'||Date.parse(r.observedAt||0)>=Date.now()-14*86400000);
const sociologySnapshot=sociologyFeed([...retainedSociology,...sociologyInputs],sociologyRules,{updatedAt:new Date().toISOString(),source:'Shared employer APIs and separately labeled community index',sourceCoverage,communityCoverage,errors});
await writeFile(new URL('sociology-opportunities.json',OUTPUT_ROOT),JSON.stringify(sociologySnapshot,null,2)+'\n');
console.log(`Sociology refresh: ${sociologySnapshot.counts.focused} focused internships/student placements, ${sociologySnapshot.counts.entryLevel} experience roles, ${sociologySnapshot.counts.broaderManagement} broader management candidates.`);
