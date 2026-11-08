import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBoard} from '../scripts/discover-sources.mjs';
import {postingKey} from '../scripts/posting-key.mjs';
import {communityJobs} from '../scripts/community.mjs';
import {workdayJobs} from '../scripts/workday.mjs';
import {classify} from '../scripts/relevance.mjs';
import {opportunityKind} from '../eligibility.mjs';
import {readFile} from 'node:fs/promises';
const rules=JSON.parse(await readFile(new URL('../opportunity-rules.json',import.meta.url)));

test('one requisition remains one opportunity across tracking URLs and locale routes',()=>{
 assert.equal(postingKey('https://boards.greenhouse.io/example/jobs/123?gh_src=x'),postingKey('https://job-boards.greenhouse.io/example/jobs/123?utm_source=y'));
 assert.equal(postingKey('https://employer.wd1.myworkdayjobs.com/en-US/External/job/City/HR-Intern_JR001'),postingKey('https://employer.wd1.myworkdayjobs.com/External/job/City/HR-Intern_JR001'));
 assert.equal(postingKey('https://boards.greenhouse.io/embed/job_app?for=example&token=123'),postingKey('https://job-boards.greenhouse.io/example/jobs/123'));
 assert.notEqual(postingKey('https://jobs.smartrecruiters.com/oneclick-ui/company/example/publication/a'),postingKey('https://jobs.smartrecruiters.com/oneclick-ui/company/example/publication/b'));
 assert.notEqual(postingKey('https://employer.wd1.myworkdayjobs.com/External/job/HR-Intern_JR001'),postingKey('https://employer.wd1.myworkdayjobs.com/External/job/HR-Intern_JR002'));
});
test('discovery accepts supported vendor URLs and rejects arbitrary hosts',()=>{
 assert.equal(normalizeBoard({platform:'workday',company:'Example',api_url:'https://example.wd1.myworkdayjobs.com/wday/cxs/example/External/jobs',board_url:'https://example.wd1.myworkdayjobs.com/External'}).id,'example.wd1.myworkdayjobs.com|example|External');
 assert.equal(normalizeBoard({platform:'workday',company:'Bad',api_url:'https://127.0.0.1/wday/cxs/bad/site/jobs'}),null);
});
test('Workday continues after page-two total=0 and rejects closed/expired postings',async()=>{
 const offsets=[];
 const result=await workdayJobs('example.myworkdayjobs.com|tenant|Careers',async(url,opts)=>{
  if(opts){const {offset}=JSON.parse(opts.body);offsets.push(offset);return {total:offset===0?41:0,jobPostings:Array.from({length:offset===40?1:20},(_,i)=>({title:'Case Management Intern',externalPath:'/job/'+(offset+i)}))};}
  const id=Number(url.split('/').pop());return {jobPostingInfo:{title:'Case Management Intern',canApply:id!==0,posted:true,endDate:id===1?'2020-01-01':'2099-01-01',jobDescription:'Undergraduates welcome'}};
 },()=>true);
 assert.deepEqual(offsets,[0,20,40,0,20,40]);assert.equal(result.jobs.length,39);
});
test('internship breadth preserves the undergraduate and school-access requirements',()=>{
 assert.equal(opportunityKind('Undergraduate Research Assistant','Enrolled undergraduate students',rules),'internship');
 assert.equal(opportunityKind("User Research Intern - Master's",'Research position',rules),null);
 assert.equal(opportunityKind('MBA HR Summer Intern','Graduate training',rules),null);
 assert.equal(opportunityKind('HR Intern','Undergraduates welcome',rules),'internship');
 assert.equal(opportunityKind('Case Management Intern','Must be enrolled at an accredited college or university',rules),'internship');
 assert.equal(opportunityKind('Psychology Intern','Only open to Duke University students',rules),null);
 assert.equal(opportunityKind('Master’s Level Clinical Intern','Clinical training',rules),null);
 assert.equal(opportunityKind('Mental Health Technician','Paid training provided; high school diploma',rules),'entry-level');
 assert.equal(opportunityKind('Legal Research Intern','Research internship',rules),null);
});

test('community import preserves provenance and excludes stale/non-US observations',async()=>{
 const rows=await communityJobs(async()=>[
  {role:'HR Intern',company:'Employer',country_iso:'US',link:'https://example.org/apply',observed_at:new Date().toISOString()},
  {role:'HR Intern',country_iso:'GB',link:'https://example.org/uk',observed_at:new Date().toISOString()},
  {role:'HR Intern',country_iso:'US',link:'https://example.org/old',observed_at:'2020-01-01'}
 ]);
 assert.equal(rows.length,1);assert.equal(rows[0].verification,'community-index');
});

test('focused research requires psychology-related subject matter; broader management remains distinct',()=>{
 assert.equal(classify('AI Research Intern','AI models',rules),null);
 assert.equal(opportunityKind('Research Intern - PhD','Research position',rules),null);
 assert.equal(classify('Research Intern','Quantum physics experiments',rules),null);
 assert.equal(classify('Research Intern','Conduct clinical research with psychology participants',rules),'adjacent');
 assert.equal(classify('Client Sales Intern','Our company values psychological safety and social impact.',rules),null);
 assert.equal(classify('Environmental Planning Intern','Public health and social impact matter.',rules),null);
 assert.equal(classify('People Experience Intern','Undergraduates welcome',rules),'adjacent');
 assert.equal(classify('Management Trainee Intern','Open to undergraduates',rules),'broader');
});

test('Workday retrieves configured student searches and complete source locations',async()=>{
 const searches=[];
 const result=await workdayJobs('example.myworkdayjobs.com|tenant|Careers',async(url,opts)=>{
  if(opts){searches.push(JSON.parse(opts.body).searchText);return {total:1,jobPostings:[{title:'Undergraduate Research Assistant',externalPath:'/job/test_JR123'}]};}
  return {jobPostingInfo:{title:'Undergraduate Research Assistant',jobDescription:'Undergraduate psychology students welcome',jobRequisitionLocation:{descriptor:'Charlotte, NC'},additionalLocations:['Harrisburg, NC',{descriptor:'Matthews, NC'}],canApply:true,posted:true}};
 },()=>true,['"research assistant"','"student research"']);
 assert.deepEqual(searches,['"research assistant"','"student research"']);assert.equal(result.jobs.length,1);assert.equal(result.jobs[0].location,'Charlotte, NC; Harrisburg, NC; Matthews, NC');
 assert.equal(postingKey('https://aah.wd115.myworkdayjobs.com/External/job/HR-Intern_R123'),postingKey('https://aah.wd5.myworkdayjobs.com/External/job/HR-Intern_R123'));
});

test('employer career API follows all pages and keeps descriptions for screening',async()=>{
 const {jibeJobs}=await import('../scripts/jibe.mjs');const pages=[];
 const result=await jibeJobs({url:'https://careers.example.org',employer:'Example',searches:['intern']},async url=>{
  const page=Number(new URL(url).searchParams.get('page'));pages.push(page);return {totalCount:2,jobs:[{data:{req_id:String(page),title:'HR Intern',description:'Must be an undergraduate',city:'Charlotte',state:'NC',country:'US',applyable:page===1}}]};
 });
 assert.deepEqual(pages,[1,2]);assert.equal(result.scanned,2);assert.equal(result.jobs.length,1);assert.match(result.jobs[0].description,/undergraduate/);
 await assert.rejects(()=>jibeJobs({url:'https://careers.example.org'},async()=>({totalCount:5,jobs:[{data:{req_id:'same'}}]})),/Incomplete career pagination/);
});
