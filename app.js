import { opportunityKind, careerPath } from './eligibility.mjs';
import { assessRole, skillEvidence, resumeFacts } from './resume-fit.mjs';
import { listingStatus, studentEligibilityNotes } from './listing-quality.mjs';
import { CITY_AREAS, METRO_NEIGHBORS, nearbyPlaces, locationInventory, findCitySearch, cityCoverage, TRACKER_STATUSES, STATE_NAMES, matchesAdvanced, relevance, trackerCSV, updateApplication, alertCandidates, sourcePostedDate, workMode, payType } from './student-tools.mjs?v=20261107-path49-metro-1';
const isSociology=document.body?.dataset?.discipline==='sociology';
const PROFILE=isSociology?{primaryType:'sociology',rulesUrl:'./sociology-rules.json',feedUrl:'./sociology-opportunities.json',focusedPrefix:'Sociology research, policy & community'}:{primaryType:'psychology',rulesUrl:'./opportunity-rules.json',feedUrl:'./opportunities.json',focusedPrefix:'Clinical, research & HR/I/O'};
function readLocal(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:fallback;}catch{return fallback}}
function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false}}
const preferencesKey=isSociology?'ninerpath-preferences-sociology':'ninerpath-preferences-psychology';
const alertsKey=isSociology?'ninerpath-alerts-sociology':'ninerpath-alerts-psychology';
const applicationsKey='ninerpath-applications-v1';
let preferences=readLocal(preferencesKey,{paths:[],location:'',mode:'all',paid:false,configured:false});
if(!Array.isArray(preferences.paths))preferences.paths=[];
let applications=readLocal(applicationsKey,{}),alertSettings=readLocal(alertsKey,{baseline:null,read:[],scope:'shortlist',days:7});
if(!Array.isArray(alertSettings.read))alertSettings.read=[];
if(!Array.isArray(alertSettings.baseline))alertSettings.baseline=null;
let activeAlerts=[],alertLimit=20,trackerFilter='all',lastFeedAttempt=0,cityCacheFeed=null,locationRows=[],locationPage=1,locationQuery='';
const savedStorageKey=isSociology?'fieldnote-saved-sociology':'fieldnote-saved';
let eligibilityRules=null;let programEligibility={};let feedCoverage=null;
let storedSaved=[];try{storedSaved=JSON.parse(localStorage.getItem(savedStorageKey)||'[]')}catch{}
let resumeRequest=0;
let resumeText='',resumeEvidence={},resumeProfile={},resumeAnalysisCache=new Map();
const state={season:'all',path:'all',kind:isSociology?'all':'internship',category:'all',query:'',location:'',remote:false,focus:'all',paid:false,saved:new Set(storedSaved),resumeSkills:new Set(),broadPage:1,page:1,pageSize:20,region:'',mode:'all',compensation:'all',postedDays:'all',trusted:false,metro:readLocal('path49-location-scope',{metro:true}).metro!==false,exactLocation:null};
const cityParam=new URLSearchParams(window.location?.search||'').get('city');
if(cityParam&&findCitySearch(cityParam)){state.location=cityParam;state.kind='internship';state.metro=true;}
const programs=isSociology?[]:[
  {title:'Summer Undergraduate Psychology Experience in Research (SUPER)',org:'American Psychological Association',place:'Remote mentorship with a faculty host',status:'2027 applications expected late November or early December 2026 · deadline March 1, 2027',date:'Summer 2027',url:'https://www.apa.org/science/programs/super-fellowship',type:'Psychology research fellowship'},
  {title:'Undergraduate Summer Internship',org:'Pace University Counseling Center',place:'New York, NY',status:'Summer dates posted · application details on program page',date:'May 19 – July 23, 2027',url:'https://www.pace.edu/counseling/psychology-training-programs/undergraduate-summer-internship',type:'Psychology'},
  {title:'Summer Neuroscience Internship Program (SNIP)',org:'University of Florida',place:'Gainesville, FL',status:'Applications open November 12, 2026',date:'May 24 – July 30, 2027',url:'https://neuroscience.ufl.edu/programs/neuroscience-ufl-edu-training-summer-neuroscience-internship-program/',type:'Psychology & neuroscience'},
  {title:'SYNAPSE Neuroscience Internship',org:'Princeton Neuroscience Institute',place:'Princeton, NJ',status:'2027 program dates posted · check application portal for current status',date:'May 31 – July 30, 2027',url:'https://pni.princeton.edu/apply/undergraduate-summer-research-programs/application-process',type:'Research'},
  {title:'Summer Neuroscience Program',org:'Duke Institute for Brain Sciences',place:'Durham, NC',status:'Applications open December 11, 2026',date:'June 7 – July 30, 2027',url:'https://experiences.duke.edu/opportunities/summer-neuroscience-program/',type:'Psychology & neuroscience'},
  {title:'Clinical Research Internship',org:'Rutgers–Princeton Center for Computational Cognitive Neuropsychiatry',place:'New Brunswick, NJ / Princeton, NJ',status:'Summer 2027 applications open January 2027',date:'9 weeks · dates pending',url:'https://ccnp.princeton.edu/trainee-opportunities/',type:'Psychology & clinical research'}
  ,{title:'Psychology Clinic Undergraduate Internship',org:'University of Georgia Psychology Clinic',place:'Athens, GA',status:'Undergraduate clinic experience; course credit and year-long commitment. Summer 2027 start deadline: March 1, 2027.',date:'Summer 2027 start',url:'https://www.psychology.uga.edu/undergraduate-internship',type:'Supervised clinical exposure'}
  ,{title:'Psychology Clinic Undergraduate Summer Internship',org:'Pace University Counseling Center',place:'New York, NY',status:'Undergraduate program with research, outreach, seminars, and supervised clinical exposure. Applications accepted in January.',date:'May 19 – July 23, 2027',url:'https://www.pace.edu/counseling/psychology-training-programs/undergraduate-summer-internship',type:'Supervised clinical exposure'}
  ,{title:'Neuroscience Undergraduate Research Opportunity (NURO)',org:'West Virginia University',place:'Morgantown, WV',status:'Research intensive summer internships; psychology is an eligible background. Check official page for application status.',date:'May 31 – July 30, 2027',url:'https://medicine.wvu.edu/neuroscience/about-us/training-and-internships/neuroscience-undergraduate-research-opportunity-nuro/',type:'Psychology lab / research program'}
  ,{title:'Behavior Science Research Experience for Undergraduates',org:'West Virginia University',place:'Morgantown, WV',status:'NSF-funded undergraduate research program in experimental psychology. Application deadline: February 15, 2027.',date:'Summer 2027',url:'https://psychology.wvu.edu/behavior-science-reu',type:'Psychology lab / research program'}
  ,{title:'Summer Undergraduate Research Program (SURP)',org:'Fred Hutchinson Cancer Center',place:'Seattle, WA',status:'2027 application is live; interdisciplinary clinical, population, and lab research. Check eligibility on program page.',date:'Summer 2027 · 9 weeks',url:'https://www.fredhutch.org/en/education-training/undergraduate-students/summer-undergraduate-research-program.html',type:'Clinical research program'}
  ,{title:'Summer Research Programs / SYNAPSE',org:'Princeton Neuroscience Institute',place:'Princeton, NJ',status:'Applications open; students are matched with research labs. Check current deadline and eligibility.',date:'May 31 – July 30, 2027',url:'https://pni.princeton.edu/apply/undergraduate-summer-interns',type:'Psychology lab / research program'}
];
let liveRoles=[];let feedUpdatedAt=null;let liveFeedLoaded=false;let liveFeedError=false;
const skillAliases={"research methods":["research","study","participant","method","experiment","literature review"],"data analysis":["data","excel","spss","r studio","python","statistics","statistical"],"child development":["child development","youth development","pediatric","early childhood"],"empathy":["empathy","empathetic","support","care","active listening"],"documentation":["documentation","document","records","notes","writing case"],"teamwork":["teamwork","collaborat","team","cross-functional"],"survey design":["survey","questionnaire","qualtrics","feedback"],"communication":["communication","communicat","presentation","interpersonal"],"outreach":["outreach","community","volunteer","engagement"],"writing":["writing","written","editing","content"],"interviewing":["interview","interviewing","qualitative","focus group"],"neuroscience":["neuroscience","neuropsych","cognitive","brain"]};
if(isSociology){
 delete skillAliases.neuroscience;
 Object.assign(skillAliases,{'policy analysis':['policy','legislation','advocacy','legislative'],'program evaluation':['program evaluation','impact evaluation','outcomes','assessment'],'community outreach':['outreach','community','organizing','engagement'],'research methods':['sociology','social science','qualitative','quantitative','research','methods'],'data analysis':['statistics','statistical','data','excel','spss','stata','python','r studio']});
}
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:'#'}catch{return '#'}};
const postingDateFormatter=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
function postingDates(role){
 const parse=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value))return null;const day=value.slice(0,10),date=new Date(day+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day)return null;return {iso:day,label:postingDateFormatter.format(date)}};
 const raw=role.datePosted||role.date_posted||role.posted_at||role.date;
 // Older Greenhouse snapshots stored updated_at as datePosted. Never call that the posting date.
 const legacyGreenhouse=role.source==='Greenhouse'&&!role.dateUpdated;
 return {posted:parse(legacyGreenhouse?null:raw),updated:parse(role.dateUpdated||(legacyGreenhouse?raw:null)),community:role.verification==='community-index'};
}
function roleAssessment(role){if(!resumeText)return null;const key=role.id||role.url;if(!resumeAnalysisCache.has(key))resumeAnalysisCache.set(key,assessRole(role,{text:resumeText,profile:resumeProfile,skills:resumeEvidence}));return resumeAnalysisCache.get(key)}
function roleMatch(role){if(!state.resumeSkills.size)return null;const skills=(role.skills||[]).map(s=>s.toLowerCase());const matched=[...state.resumeSkills].filter(s=>skills.includes(s));return skills.length?Math.round(matched.length/skills.length*100):null}
function allRoles(){return liveRoles.filter(r=>listingStatus(r).state!=='closed').map((r,i)=>{
 const match=roleMatch(r),assessment=roleAssessment(r),quality=listingStatus(r);
 const value={...r,description:r.description||'',postingDates:postingDates(r),assessment,quality,eligibilityNotes:studentEligibilityNotes(r.title,r.description||''),checkedAt:r.verification==='community-index'?r.observedAt:(r.lastSeen||r.last_seen_at),verification:r.verification||'employer-api',careerPath:r.careerPath||careerPath(r.title,eligibilityRules),opportunityKind:r.opportunityKind,id:String(r.id||r.url||'live-'+i),title:r.title,org:r.org,mark:(r.org||'').slice(0,2),logo:r.type===PROFILE.primaryType?'purple':'orange',type:r.type,place:r.location||'See source for location',duration:r.season||'Season not specified',pay:r.pay||(payType(r)==='paid'?'Pay / stipend mentioned':payType(r)==='unpaid'?'Unpaid':'Pay not specified'),deadline:r.deadline||r.validThrough||r.listingCheck?.validThrough||'See posting',match,skills:r.skills?.length?r.skills:['Skills not specified'],desc:r.description||'',url:r.url,source:r.source};
 value.ranking=relevance({...value,deadline:r.deadline},preferences,assessment);return value;
})}
function sortRoles(rows){
 const sort=$('#sort-select')?.value||'recommended';
 const posted=r=>sourcePostedDate(r)||0,deadline=r=>{const t=Date.parse(r.deadline);return Number.isFinite(t)?t:Infinity};
 if(sort==='deadline')rows.sort((a,b)=>deadline(a)-deadline(b));
 else if(sort==='newest')rows.sort((a,b)=>posted(b)-posted(a));
 else if(sort==='match')rows.sort((a,b)=>(b.match??-1)-(a.match??-1));
 else rows.sort((a,b)=>(a.opportunityKind==='internship'?0:1)-(b.opportunityKind==='internship'?0:1)||b.ranking.score-a.ranking.score||String(a.id).localeCompare(String(b.id)));
 return rows;
}
function filteredRoles(){return sortRoles(allRoles().filter(o=>o.careerPath!=='Broader management / leadership').filter(o=>state.season==='all'||o.duration===state.season).filter(o=>state.path==='all'||o.careerPath===state.path).filter(o=>state.kind==='all'||o.opportunityKind===state.kind).filter(o=>state.category==='all'||o.type===state.category).filter(o=>matchesAdvanced(o,state)))}
function renderCitySearch(){
 if(!liveFeedLoaded||cityCacheFeed===liveRoles)return;cityCacheFeed=liveRoles;
 const cities=cityCoverage(liveRoles,Date.now(),state.metro),byId=new Map(cities.map(city=>[city.id,city]));
 $('#city-search-options').innerHTML=cities.map(city=>`<option value="${esc(city.label)}">${city.internships} internships · ${city.experience} entry-level</option>`).join('');
 const card=city=>`<button type="button" class="city-search-button" data-search-city="${esc(city.id)}"><span>${esc(city.name)}<small>${esc(city.state)}</small>${state.metro&&METRO_NEIGHBORS[city.id]?'<em class="metro-label">metro</em>':''}</span><b><span>${city.internships}</span><small>${city.internships===1?'internship':'internships'}</small></b><small>+ ${city.experience} entry-level ${city.experience===1?'role':'roles'}</small></button>`;
 $('#popular-city-searches').innerHTML=['charlotte','seattle','new-york','washington-dc','chicago','los-angeles','boston','san-francisco'].map(id=>card(byId.get(id))).join('');
 $('#all-city-searches').innerHTML=cities.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(card).join('');
 const inventory=locationInventory(liveRoles,Date.now(),state.metro);locationRows=inventory.groups;renderLocationInventory();
 const active=liveRoles.filter(role=>listingStatus(role).state!=='closed'),interns=active.filter(role=>role.opportunityKind==='internship').length,entry=active.filter(role=>role.opportunityKind==='entry-level').length;
 $('#city-count-explainer').innerHTML=`<strong>Whole catalogue, all locations: ${active.length.toLocaleString()} roles</strong><span>${interns.toLocaleString()} internships + ${entry.toLocaleString()} entry-level roles. ${inventory.featuredInternships.toLocaleString()} internships match these featured ${state.metro?'city / metro searches':'cities'}; ${inventory.otherInternships.toLocaleString()} are at other posted locations. Browse every location below. Entry-level roles are separate.</span>`;
 $('#metro-search').checked=state.metro;
 $('#metro-place-list').innerHTML=Object.keys(METRO_NEIGHBORS).map(id=>{const city=CITY_AREAS.find(c=>c.id===id);return `<p><strong>${esc(city.name)}:</strong> ${nearbyPlaces(city).map(place=>esc(place.name+', '+place.state)).join('; ')}</p>`}).join('');
 $('#city-coverage-label').textContent=`${cities.length} featured city searches; the catalogue also includes other cities, towns and locations outside this picker. City counts include focused and broader management internships before filters. A multi-location role counts once per matching city. Zero means no matches in the current feed.`;
}
$('#city-directory').addEventListener('click',e=>{const button=e.target.closest('[data-search-city]');if(!button)return;const city=CITY_AREAS.find(value=>value.id===button.dataset.searchCity);if(!city)return;state.exactLocation=null;
 if(findCitySearch(state.query)){state.query='';$('#search-input').value='';}
 state.location=city.label;$('#location-input').value=city.label;
 if(state.region&&state.region!==city.state){state.region='';$('#region-filter').value='';toast('State filter cleared for '+city.label+'.');}
 state.page=1;state.broadPage=1;render();$('#search-summary').scrollIntoView({behavior:'smooth',block:'center'});
});
function renderLocationInventory(){
 const rows=locationRows.map((row,index)=>({...row,index})).filter(row=>matchesLocationList(row.label,locationQuery));
 const pages=Math.max(1,Math.ceil(rows.length/12));locationPage=Math.min(locationPage,pages);
 $('#posted-location-list').innerHTML=rows.slice((locationPage-1)*12,locationPage*12).map(row=>`<button type="button" class="posted-location-button" data-source-location="${row.index}"><strong>${esc(row.label)}</strong><span>${row.internships} internships · ${row.experience} entry-level</span></button>`).join('')||'<p>No source locations match this search.</p>';
 $('#posted-location-summary').textContent=`${rows.length} source location labels · each role is counted once under its complete location as posted. Labels can include multiple cities, international sites, remote regions or missing locations.`;
 $('#posted-location-pages').innerHTML=`<button type="button" class="filter-button" data-location-page="${Math.max(1,locationPage-1)}" ${locationPage===1?'disabled':''}>← Previous</button><span>Page ${locationPage} of ${pages}</span><button type="button" class="filter-button" data-location-page="${Math.min(pages,locationPage+1)}" ${locationPage===pages?'disabled':''}>Next →</button>`;
}
function matchesLocationList(label,query){return query.toLowerCase().split(/\s+/).filter(Boolean).every(term=>label.toLowerCase().includes(term));}
$('#metro-search').addEventListener('change',e=>{state.metro=e.target.checked;writeLocal('path49-location-scope',{metro:state.metro});cityCacheFeed=null;state.page=1;state.broadPage=1;render()});
$('#posted-location-query').addEventListener('input',e=>{locationQuery=e.target.value.trim();locationPage=1;renderLocationInventory()});
$('#posted-location-pages').addEventListener('click',e=>{const button=e.target.closest('[data-location-page]');if(button){locationPage=Number(button.dataset.locationPage);renderLocationInventory()}});
$('#posted-location-list').addEventListener('click',e=>{const button=e.target.closest('[data-source-location]');if(!button)return;const row=locationRows[Number(button.dataset.sourceLocation)];if(!row)return;
 state.exactLocation=row.location;state.location=row.label;$('#location-input').value=row.label;if(findCitySearch(state.query)){state.query='';$('#search-input').value='';}state.region='';$('#region-filter').value='';state.page=1;state.broadPage=1;render();$('#search-summary').scrollIntoView({behavior:'smooth',block:'center'});
});
function renderSearchSummary(focused,broader){
 const active=Boolean(state.query||state.location||state.path!=='all'||state.category!=='all'||state.season!=='all'||state.region||state.mode!=='all'||state.compensation!=='all'||state.postedDays!=='all'||state.trusted||state.kind==='entry-level');
 const box=$('#search-summary');box.classList.toggle('hidden',!active||!liveFeedLoaded);if(!active||!liveFeedLoaded)return;
 const total=focused.length+broader.length;
 const extraEntry=state.kind==='internship'?allRoles().filter(r=>r.opportunityKind==='entry-level'&&r.careerPath!=='Broader management / leadership').filter(r=>state.path==='all'||r.careerPath===state.path).filter(r=>state.category==='all'||r.type===state.category).filter(r=>state.season==='all'||r.duration===state.season).filter(r=>matchesAdvanced(r,state)).length:0;
 const filters=[['query',state.query?'Search: '+state.query:''],['location',state.location?'Location: '+state.location:''],['path',state.path!=='all'?state.path:''],['category',state.category!=='all'?'Category: '+state.category:''],['season',state.season!=='all'?state.season:''],['region',state.region?'State: '+(STATE_NAMES[state.region]||state.region):''],['mode',state.mode!=='all'?'Work setting: '+state.mode:''],['compensation',state.compensation!=='all'?'Compensation: '+state.compensation:''],['postedDays',state.postedDays!=='all'?'Posted within '+state.postedDays+' days':''],['trusted',state.trusted?'Recent source check only':''],['kind',state.kind!=='all'?(state.kind==='internship'?'Internships only':'Entry-level only'):'']].filter(([,label])=>label);
 box.innerHTML=`<div class="search-summary-heading"><strong>${total} ${total===1?'match':'matches'} across both sections</strong><span>${focused.length} focused · ${broader.length} broader management</span></div><div class="search-summary-links">${broader.length?`<a href="#broader-internships">See ${broader.length} broader ${broader.length===1?'internship':'internships'} ↓</a>`:''}${extraEntry?`<button type="button" data-include-entry>Include ${extraEntry} matching entry-level ${extraEntry===1?'role':'roles'}</button>`:''}</div><div class="active-search-filters" aria-label="Active search filters">${filters.map(([key,label])=>`<button type="button" data-clear-search-filter="${key}" aria-label="${esc('Remove '+label)}">${esc(label)} <span aria-hidden="true">×</span></button>`).join('')}</div><p>Counts reflect the collected feed, not every job available in this city. ${state.metro?'Metro search includes the listed nearby places where configured.':'City-only search excludes nearby places.'} Remote roles are included only when their source location matches your search.</p>`;
}
$('#search-summary').addEventListener('click',e=>{
 if(e.target.closest('[data-include-entry]')){state.kind='all';$('#opportunity-kind').value='all';}
 else{const button=e.target.closest('[data-clear-search-filter]');if(!button)return;const key=button.dataset.clearSearchFilter;
 const defaults={query:'',location:'',path:'all',category:'all',season:'all',region:'',mode:'all',compensation:'all',postedDays:'all',trusted:false,kind:'all'};
 if(!(key in defaults))return;state[key]=defaults[key];if(key==='location')state.exactLocation=null;
 const controls={query:'search-input',location:'location-input',path:'career-path-filter',season:'season-filter',region:'region-filter',mode:'mode-filter',compensation:'pay-filter',postedDays:'posted-filter',trusted:'trusted-filter',kind:'opportunity-kind'};
 if(controls[key]){const input=$('#'+controls[key]);if(key==='trusted')input.checked=false;else input.value=state[key];}
 }state.page=1;state.broadPage=1;render();
});
function assessmentHTML(result){
 if(!result)return '<a class="eligibility-start" href="#profile">Add your resume to review requirements ↗</a>';
 const groups=[['met','Evidence found'],['gap','Potential gaps'],['unknown','Needs confirmation']];
 return `<details class="eligibility-review"><summary>Resume &amp; requirements review · ${result.requiredGaps?result.requiredGaps+' required-condition gap(s)':result.noRequirements?'Confirm employer requirements':result.unknown+' to confirm'}</summary><p class="review-explainer">Evidence checks, not an eligibility decision or hiring prediction. Only the employer can confirm eligibility. Skills found: keywords, not proof of proficiency.</p>${result.incomplete?'<p class="review-caution">The available description may be incomplete. Compare these checks with the full employer posting.</p>':''}${result.noRequirements?'<p class="review-caution">No explicit mandatory requirements were identified in the available text. This does not mean the role has no requirements.</p>':''}${groups.map(([status,label])=>{const checks=result.checks.filter(c=>c.status===status);return `<section class="review-group review-${status}"><h4>${label} (${checks.length})</h4>${checks.length?checks.map(c=>`<div class="review-check"><strong>${esc(c.area==='skill'?'Listed skill':c.area[0].toUpperCase()+c.area.slice(1))}</strong> <span class="requirement-kind">${esc(c.kind==='skill'?'Skill mention':c.kind==='unspecified'?'Requirement strength unclear':c.kind)}</span><blockquote>${esc(c.requirement)}</blockquote>${c.evidence?`<p>${esc(c.evidence)}</p>`:''}<small>${esc(c.note)}</small></div>`).join(''):'<p>No checks in this group.</p>'}</section>`}).join('')}</details>`;
}
function roleCard(o){return `
      <article class="role-card" data-id="${esc(o.id)}">
        <div class="role-main">
          <div class="org-logo logo-${esc(o.logo)}">${esc(o.mark)}</div>
          <div class="role-info">
            <div class="role-title-row">
              <h3 class="role-title">${esc(o.title)}</h3>
              <span class="category-badge ${o.type === PROFILE.primaryType ? 'psych-badge' : 'adjacent-badge'}">${esc(o.careerPath)}</span>
              ${o.match===null?'':`<span class="match-pill">${o.match}% listed skills found</span>`}
            </div>
            <div class="org-name">${esc(o.org)} · ${o.opportunityKind==='internship'?'Internship / student placement':'Entry-level experience'}</div>
            <div class="listing-signals"><span class="quality-badge quality-${esc(o.quality.state)}" title="${esc(o.quality.reason)}">${esc(o.quality.label)}</span><span class="student-signal">${esc(o.eligibilityNotes[0])}</span></div>
            <div class="role-meta">
              <span class="posted-date">Posted: ${o.postingDates.posted?`<time datetime="${esc(o.postingDates.posted.iso)}">${esc(o.postingDates.posted.label)}</time>${o.postingDates.community?' (community-reported)':''}`:'Date not provided'}</span>${o.postingDates.updated?`<span>Updated: <time datetime="${esc(o.postingDates.updated.iso)}">${esc(o.postingDates.updated.label)}</time></span>`:''}<span>⌖ ${esc(o.place)}</span><span>◷ ${esc(o.duration)}</span><span>＄ ${esc(o.pay)}</span><span>◷ Apply by ${esc(o.deadline)}</span>
            </div>
          </div>
        </div>
        <p class="role-preview">${esc((o.desc||'Description unavailable; review the original posting.').slice(0,190))}${o.desc.length>190?'…':''}</p>
        ${preferences.configured||resumeText?`<p class="ranking-reasons">Recommended because: ${esc(o.ranking.reasons.slice(0,4).join(' · ')||'General undergraduate experience')}</p>`:''}
        <div class="role-bottom">
          <div class="skill-tags"><span class="skill-label">Skills you’ll use</span>${o.skills.slice(0,5).map(skill => `<span class="skill-tag ${state.resumeSkills.has(skill.toLowerCase()) ? 'matched' : ''}">${state.resumeSkills.has(skill.toLowerCase()) ? '✦ ' : ''}${esc(skill)}</span>`).join('')}</div>
          <div class="role-actions">
            <button class="save-button ${state.saved.has(String(o.id)) ? 'saved' : ''}" aria-label="${state.saved.has(String(o.id)) ? 'Unsave' : 'Save'} ${esc(o.title)}" title="Save role" type="button">${state.saved.has(String(o.id)) ? '♥' : '♡'}</button>
            <button class="track-button ${applications[o.id]?'is-tracked':''}" type="button">${applications[o.id]?'View application':'Track application'}</button>
            <button class="details-button" type="button" aria-expanded="false">Details ▾</button>
            <a class="posting-button" href="${safeUrl(o.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc('Open posting for '+o.title)}">Open posting <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        ${assessmentHTML(o.assessment)}
        <div class="role-description"><ul class="eligibility-notes">${o.eligibilityNotes.map(note=>`<li>${esc(note)}</li>`).join('')}</ul><p>${esc(o.quality.reason)}</p>${esc(o.desc)} <a href="${safeUrl(o.url)}" target="_blank" rel="noopener noreferrer" class="apply-link" data-id="${esc(o.id)}">Visit original job posting ↗</a><br>
          ${o.listingCheck?`<small>Posting page checked ${esc(new Date(o.listingCheck.checkedAt).toLocaleString())} · ${esc(o.listingCheck.reason)}</small>`:''}<small>${o.verification==='community-index'?'Community-index candidate: confirm the full qualifications, availability and application status with the employer. ':''}Source: ${esc(o.source || 'Employer careers page')}. Last source observation ${o.checkedAt ? esc(new Date(o.checkedAt).toLocaleString()) : 'not recorded'}. Verify the posting is still open.</small>
        </div>
      </article>`;}
function render() {
  renderCitySearch();
  const rows = filteredRoles();
  const pageCount=Math.max(1,Math.ceil(rows.length/state.pageSize));state.page=Math.min(state.page,pageCount);const visibleRows=rows.slice((state.page-1)*state.pageSize,state.page*state.pageSize);
  const sourceSet = liveFeedLoaded;
  const list = $('#role-list');

  if (rows.length) {
    list.innerHTML = visibleRows.map(roleCard).join('');
  } else {
    const hasFilters=Boolean(state.query||state.location||state.category!=='all'||state.path!=='all'||state.season!=='all'||state.region||state.mode!=='all'||state.compensation!=='all'||state.postedDays!=='all'||state.trusted);
    const title = liveFeedError ? 'Listings feed unavailable' : !liveFeedLoaded ? 'Loading live listings…' : hasFilters ? 'No roles match these filters' : 'No live postings in the current feed yet';
    const message = liveFeedError
      ? 'Current listings could not be loaded. Please refresh the page later.'
      : !liveFeedLoaded
        ? 'Checking public employer postings and Summer 2027 programs.'
      : sourceSet
        ? 'The connected public employer boards did not return a match for these filters. Search upcoming programs below or reset filters. New postings are checked daily.'
        : 'Try a broader search or clear a filter to see more opportunities.';
    list.innerHTML = `<div class="empty-state"><strong>${title}</strong>${message}</div>`;
  }

  $('#feed-notice').classList.toggle('hidden', !sourceSet);
  $('#result-count').textContent = liveFeedLoaded ? rows.length : '…';
  $('#showing-count').textContent = liveFeedLoaded ? rows.length : '…';
  $('#pagination').innerHTML=rows.length>state.pageSize?`<div class="pagination-controls"><label>Per page <select id="page-size"><option value="20" ${state.pageSize===20?'selected':''}>20</option><option value="50" ${state.pageSize===50?'selected':''}>50</option><option value="100" ${state.pageSize===100?'selected':''}>100</option></select></label><span>Page ${state.page} of ${pageCount} · ${rows.length} roles</span><div><button type="button" data-page="${Math.max(1,state.page-1)}" ${state.page===1?'disabled':''}>← Previous</button><button type="button" data-page="${Math.min(pageCount,state.page+1)}" ${state.page===pageCount?'disabled':''}>Next →</button></div></div>`:'';
  const catalogue = liveFeedLoaded ? liveRoles.filter(r=>listingStatus(r).state!=='closed') : [];
  const internshipCount = catalogue.filter(r => r.opportunityKind === 'internship').length;
  const broadInternships=catalogue.filter(r=>r.opportunityKind==='internship'&&r.careerPath==='Broader management / leadership').length;
  const focusedInternships=internshipCount-broadInternships;
  const communityInternships=catalogue.filter(r=>r.opportunityKind==='internship'&&r.verification==='community-index').length;
  const entryCount = catalogue.filter(r => r.opportunityKind === 'entry-level').length;
  $('#side-count').textContent = liveFeedLoaded ? catalogue.length : '…';
  $('#side-count').title = `${catalogue.length} total listings: ${internshipCount} internships/student placements and ${entryCount} entry-level roles. The list uses your selected filters.`;
  $('#side-count').setAttribute('aria-label', `${catalogue.length} total listings in the catalogue`);
  const viewLabel = state.kind === 'internship' ? 'internships/student placements' : state.kind === 'entry-level' ? 'entry-level experience' : 'internships and entry-level experience';
  $('#catalog-summary').textContent = liveFeedError ? 'Catalogue unavailable. Please try again later.' : !liveFeedLoaded ? 'Loading catalogue totals…' : `Across all locations: ${internshipCount} internships (${focusedInternships} focused + ${broadInternships} broader management) and ${entryCount} entry-level roles. ${communityInternships} internship candidates need employer review.${feedCoverage ? ` Daily scan: ${feedCoverage.healthy} working sources; ${feedCoverage.failed} unavailable.` : ''}`;
  $('#psych-stat-label').textContent = 'internships across both sections';
  $('#adjacent-stat-label').textContent = 'entry-level experience roles';
  const base = liveFeedLoaded ? liveRoles.filter(r=>r.careerPath!=='Broader management / leadership').filter(r=>state.kind==='all'||r.opportunityKind===state.kind).filter(r=>state.path==='all'||(r.careerPath||careerPath(r.title,eligibilityRules))===state.path).filter(r=>state.season==='all'||r.season===state.season).filter(r=>matchesAdvanced(r,state)) : [];
  $('#psych-stat').textContent = liveFeedLoaded ? internshipCount : '…';
  $('#adjacent-stat').textContent = liveFeedLoaded ? entryCount : '…';
  $('#saved-count').textContent = state.saved.size;
  $('#saved-stat').textContent = state.saved.size;
  $('#refresh-status').textContent = liveFeedError ? 'Feed unavailable' : sourceSet ? `${feedUpdatedAt && Date.now()-Date.parse(feedUpdatedAt)>36*3600000 ? 'Refresh overdue' : 'Daily feed'} · updated ${feedUpdatedAt ? new Date(feedUpdatedAt).toLocaleDateString() : 'recently'}` : 'Loading live listings…';
  const savedRows=allRoles().filter(r=>state.saved.has(String(r.id)));
  $('#saved').classList.toggle('hidden',location.hash!=='#saved');
  $$('.nav-link').forEach(a=>a.classList.toggle('active',a.hash===(location.hash||'#opportunities')));
  $('#saved-list').innerHTML=savedRows.length?savedRows.map(r=>`<div class="saved-item"><span><b>${esc(r.title)}</b><small>${esc(r.org)}</small></span><button type="button" class="saved-open" data-id="${esc(r.id)}">View role ↗</button></div>`).join(''):'<div class="empty-state">No saved roles yet. Use the heart on a listing to keep it here in this browser.</div>';
  $('#program-list').innerHTML=programs.filter(p=>programEligibility[p.url]?.externalStudentsAllowed===true).filter((p,i,all)=>all.findIndex(other=>other.url===p.url)===i).map(p=>`<article class="program-card"><div><span class="program-type">${esc(p.type)}</span><h3>${esc(p.title)}</h3><b>${esc(p.org)}</b><p>${esc(p.place)} · ${esc(p.date)}</p><small>${esc(p.status)}</small><p><b>External-student eligibility:</b> ${esc(programEligibility[p.url].notes)}</p><small>School access checked ${esc(programEligibility[p.url].verifiedAt)} · <a href="${safeUrl(programEligibility[p.url].evidenceUrl)}" target="_blank" rel="noopener noreferrer">Eligibility source ↗</a></small></div><a href="${safeUrl(p.url)}" target="_blank" rel="noopener noreferrer">Program details ↗</a></article>`).join('');
  $('#feed-notice').textContent=liveFeedError?'Live listings are temporarily unavailable. The Summer 2027 program links below remain available.':`Showing ${rows.length} matches in ${viewLabel}. ${isSociology?'Includes social research, surveys, policy, community services and HR/organizations roles that pass the undergraduate screen.':'Internship totals include clinical support, human services, research, HR and workplace roles that pass the undergraduate screen.'} Use the opportunity selector to change views. Verify eligibility and Summer 2027 availability with the employer.`;
  let broadRows=allRoles().filter(r=>state.kind!=='entry-level'&&r.opportunityKind==='internship'&&r.careerPath==='Broader management / leadership').filter(r=>matchesAdvanced(r,state));
  if(state.season!=='all')broadRows=broadRows.filter(r=>r.duration===state.season);
  sortRoles(broadRows);
  const broadPages=Math.max(1,Math.ceil(broadRows.length/20));state.broadPage=Math.min(state.broadPage,broadPages);
  renderSearchSummary(rows,broadRows);
  $('#broader-count').textContent=liveFeedLoaded?broadRows.length:'…';
  $('#broader-nav-count').textContent=liveFeedLoaded?broadInternships:'…';
  $('#focused-heading').textContent=PROFILE.focusedPrefix+(state.kind==='entry-level'?' experience':state.kind==='all'?' opportunities':' internships');
  $('#broader-role-list').innerHTML=broadRows.length?broadRows.slice((state.broadPage-1)*20,state.broadPage*20).map(roleCard).join(''):`<div class="empty-state">${liveFeedLoaded?'No broader management internships match this search.':'Loading broader internships…'}</div>`;
  $('#broader-pagination').innerHTML=broadRows.length>20?`<div class="pagination-controls"><span>Page ${state.broadPage} of ${broadPages} · ${broadRows.length} broader internships</span><div><button type="button" data-broad-page="${Math.max(1,state.broadPage-1)}" ${state.broadPage===1?'disabled':''}>← Previous</button><button type="button" data-broad-page="${Math.min(broadPages,state.broadPage+1)}" ${state.broadPage===broadPages?'disabled':''}>Next →</button></div></div>`:'';
  const advancedActive=Boolean(state.region||state.mode!=='all'||state.compensation!=='all'||state.postedDays!=='all'||state.trusted);
  $('#filter-indicator').classList.toggle('visible',advancedActive);
  $('#filter-toggle').setAttribute('aria-expanded',String(!$('#extra-filters').classList.contains?.('hidden')));
  renderStudentTools();
  $$('.chip').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === state.category);
    button.querySelector('span').textContent = button.dataset.filter === 'all' ? base.length : base.filter(o => o.type === button.dataset.filter).length;
  });
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2500)}
$('#season-filter').addEventListener('change',e=>{state.season=e.target.value;state.page=1;render()});
$('#career-path-filter').addEventListener('change',e=>{state.path=e.target.value;state.page=1;render()});
$('#opportunity-kind').addEventListener('change',e=>{state.kind=e.target.value;state.page=1;render()});
function resetFilters(){state.exactLocation=null;Object.assign(state,{region:'',mode:'all',compensation:'all',postedDays:'all',trusted:false});$('#region-filter').value='';$('#mode-filter').value='all';$('#pay-filter').value='all';$('#posted-filter').value='all';$('#trusted-filter').checked=false;state.page=1;state.broadPage=1;state.season='all';$('#season-filter').value='all';state.path='all';$('#career-path-filter').value='all';state.kind=isSociology?'all':'internship';$('#opportunity-kind').value=state.kind;state.category='all';state.query='';state.location='';$('#search-input').value='';$('#location-input').value='';render()}
$('#pagination').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b){state.page=Number(b.dataset.page);render();$('#role-list').scrollIntoView({behavior:'smooth',block:'start'})}});$('#pagination').addEventListener('change',e=>{if(e.target.id==='page-size'){state.pageSize=Number(e.target.value);state.page=1;render()}});
$$('.chip').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.filter;state.page=1;render()}));$('#search-input').addEventListener('input',e=>{state.query=e.target.value.trim();state.page=1;state.broadPage=1;render()});$('#location-input').addEventListener('input',e=>{state.exactLocation=null;state.location=e.target.value.trim();state.page=1;state.broadPage=1;render()});$('#search-form').addEventListener('submit',e=>{e.preventDefault();state.query=$('#search-input').value.trim();state.location=$('#location-input').value.trim();state.page=1;state.broadPage=1;render();$('#role-list').scrollIntoView({behavior:'smooth',block:'start'})});$('#sort-select').addEventListener('change',()=>{state.page=1;state.broadPage=1;render()});$('#filter-toggle').addEventListener('click',()=>{const hidden=$('#extra-filters').classList.toggle('hidden');$('#filter-toggle').setAttribute('aria-expanded',String(!hidden))});$('#clear-filters').addEventListener('click',resetFilters);function onRoleCardClick(e){const card=e.target.closest('.role-card');if(!card)return;const id=card.dataset.id;if(e.target.closest('.save-button')){state.saved.has(id)?state.saved.delete(id):state.saved.add(id);if(!writeLocal(savedStorageKey,[...state.saved]))toast('Saved for this visit only; browser storage is unavailable.');render()}else if(e.target.closest('.track-button')){const role=allRoles().find(r=>r.id===id);if(!applications[id]&&role){applications=updateApplication(applications,role);const stored=writeLocal(applicationsKey,applications);$('#tracker-status').textContent=stored?'Application added to this browser’s tracker.':'Tracker is available for this visit only; export a CSV before leaving.';render()}location.hash='#tracker';$('#tracker').scrollIntoView({behavior:'smooth'});}else if(e.target.closest('.details-button')){const expanded=card.classList.toggle('expanded');e.target.closest('.details-button').setAttribute('aria-expanded',String(expanded))}}
$('#role-list').addEventListener('click',onRoleCardClick);$('#broader-role-list').addEventListener('click',onRoleCardClick);
$('#broader-pagination').addEventListener('click',e=>{const b=e.target.closest('[data-broad-page]');if(b){state.broadPage=Number(b.dataset.broadPage);render();$('#broader-internships').scrollIntoView({behavior:'smooth'})}});
$('#saved-list').addEventListener('click',e=>{const b=e.target.closest('.saved-open');if(b)openCatalogueRole(b.dataset.id)});$('#show-all-roles').addEventListener('click',()=>{resetFilters();location.hash='#opportunities'});window.addEventListener('hashchange',render);
$$('[data-search]').forEach(link=>link.addEventListener('click',()=>{const query=link.dataset.search;$('#search-input').value=query;state.query=query;state.category='all';render()}));
$('#upload-button').addEventListener('click',()=>$('#resume-input').click());$('#resume-input').addEventListener('change',e=>e.target.files[0]&&processResume(e.target.files[0]));const drop=$('#upload-card');drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragging')});drop.addEventListener('dragleave',()=>drop.classList.remove('dragging'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');const f=e.dataTransfer.files[0];if(f)processResume(f)});
const preferencePaths=isSociology?['Social research & evaluation','Policy, justice & advocacy','Community & social services','HR & organizations','Related experience','Broader management / leadership']:['Clinical / pre-therapy','Research / human behavior','I/O psychology / workplace','Related experience','Broader management / leadership'];
$('#preference-paths').innerHTML=preferencePaths.map(path=>`<label class="preference-choice"><input type="checkbox" name="preferred-path" value="${esc(path)}" ${preferences.paths.includes(path)?'checked':''}/><span>${esc(path)}</span></label>`).join('');
$('#pref-location').value=preferences.location||'';$('#pref-mode').value=preferences.mode||'all';$('#pref-paid').checked=Boolean(preferences.paid);$('#preferences').open=!preferences.configured;
$('#region-filter').innerHTML='<option value="">Any state</option>'+Object.entries(STATE_NAMES).map(([code,name])=>`<option value="${code}">${esc(name)}</option>`).join('');
$('#alert-scope').value=alertSettings.scope||'shortlist';$('#alert-days').value=String(alertSettings.days||7);
$('#preferences-form').addEventListener('submit',e=>{
 e.preventDefault();preferences={paths:$$('[name="preferred-path"]:checked').map(input=>input.value),location:$('#pref-location').value.trim(),mode:$('#pref-mode').value,paid:$('#pref-paid').checked,configured:true};
 const stored=writeLocal(preferencesKey,preferences);$('#sort-select').value='recommended';state.page=1;state.broadPage=1;
 $('#preference-status').textContent=stored?'Preferences saved on this browser.':'Preferences apply for this visit; browser storage is unavailable.';render();
});
$('#clear-preferences').addEventListener('click',()=>{
 preferences={paths:[],location:'',mode:'all',paid:false,configured:false};writeLocal(preferencesKey,preferences);
 $$('[name="preferred-path"]').forEach(input=>input.checked=false);$('#pref-location').value='';$('#pref-mode').value='all';$('#pref-paid').checked=false;$('#preference-status').textContent='Preferences reset. All career paths remain available.';render();
});
for(const [id,key] of [['region-filter','region'],['mode-filter','mode'],['pay-filter','compensation'],['posted-filter','postedDays'],['trusted-filter','trusted']])$('#'+id).addEventListener('change',e=>{state[key]=key==='trusted'?e.target.checked:e.target.value;state.page=1;state.broadPage=1;render()});
function initializeAlertBaseline(){
 if(alertSettings.baseline===null){alertSettings.baseline=liveRoles.map(r=>String(r.id));alertSettings.startedAt=new Date().toISOString();writeLocal(alertsKey,alertSettings);}
}
function renderStudentTools(){
 const catalogue=allRoles(),byId=new Map(catalogue.map(r=>[r.id,r]));
 const tracked=Object.values(applications).filter(r=>r&&TRACKER_STATUSES.includes(r.status));
 $('#tracker-count').textContent=tracked.length;
 const visible=tracked.filter(r=>trackerFilter==='all'||r.status===trackerFilter).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 $('#tracker-list').innerHTML=visible.length?visible.map(row=>{
 const current=byId.get(row.id);return `<article class="application-card" data-application-id="${esc(row.id)}"><div class="application-heading"><div><h3>${esc(row.title)}</h3><p>${esc(row.org)} · ${esc(current?.place||row.location||'Location not specified')}</p><small>${current?esc(current.quality.label):'Not in this subject’s current feed; check the original posting before applying.'}</small></div><a class="posting-button" href="${safeUrl(row.url)}" target="_blank" rel="noopener noreferrer">Open posting ↗</a></div><div class="application-fields"><label>Status<select data-app-field="status">${TRACKER_STATUSES.map(status=>`<option ${row.status===status?'selected':''}>${status}</option>`).join('')}</select></label><label>Next action / follow-up<input type="date" data-app-field="nextAction" value="${esc(row.nextAction||'')}" /></label><label class="application-notes">Your notes<textarea data-app-field="notes" maxlength="2000" rows="2" placeholder="Next steps, contacts, or interview notes…">${esc(row.notes||'')}</textarea></label></div><div class="panel-actions"><button type="button" class="filter-button" data-save-application>Save changes</button><button type="button" class="text-button" data-remove-application>Remove from tracker</button><small>Last changed ${esc(String(row.updatedAt||'').slice(0,10))}</small></div></article>`;
 }).join(''):'<div class="empty-state">No applications in this view. Use “Track application” on a listing to get started.</div>';
 $('#export-tracker').disabled=!tracked.length;
 activeAlerts=liveFeedLoaded&&!liveFeedError?alertCandidates(catalogue,{...alertSettings,preferences,tracked:applications,saved:[...state.saved]}):[];
 $('#alert-count').textContent=activeAlerts.length;
 $('#alert-status').textContent=liveFeedError?'The latest feed could not be checked. Saved application details are still available.':!liveFeedLoaded?'Waiting for the current feed…':`${activeAlerts.length} unread updates. ${feedUpdatedAt?'Catalogue updated '+new Date(feedUpdatedAt).toLocaleString()+'.':''}`;
 $('#alert-list').innerHTML=activeAlerts.length?activeAlerts.slice(0,alertLimit).map(alert=>`<article class="alert-card"><span class="alert-kind">${alert.kind==='deadline'?'DEADLINE SOON':'NEW TO THE CATALOGUE'}</span><h3>${esc(alert.title)}</h3><p>${esc(alert.org)} · ${esc(alert.detail)}</p><div class="panel-actions"><a href="${safeUrl(alert.url)}" target="_blank" rel="noopener noreferrer">Open posting ↗</a><button type="button" class="text-button" data-read-alert="${esc(alert.id)}">Mark read</button></div></article>`).join(''):'<div class="empty-state">You’re caught up. New-listing updates start after your first visit; save or track roles to get deadline reminders here.</div>';
 $('#more-alerts').classList.toggle('hidden',activeAlerts.length<=alertLimit);$('#read-alerts').disabled=!activeAlerts.length;
}
let removedApplication=null;
$('#tracker-status-filter').addEventListener('change',e=>{trackerFilter=e.target.value;renderStudentTools()});
$('#tracker-list').addEventListener('click',e=>{
 const card=e.target.closest('[data-application-id]');if(!card)return;const id=card.dataset.applicationId;
 if(e.target.closest('[data-save-application]')){
  const values=Object.fromEntries([...card.querySelectorAll('[data-app-field]')].map(input=>[input.dataset.appField,input.value]));
  if(!TRACKER_STATUSES.includes(values.status))return;
  applications[id]={...applications[id],...values,notes:String(values.notes||'').slice(0,2000),updatedAt:new Date().toISOString()};
  const stored=writeLocal(applicationsKey,applications);$('#tracker-status').textContent=stored?'Application changes saved on this browser.':'Changes are kept for this visit only. Export a CSV before leaving.';renderStudentTools();
 }else if(e.target.closest('[data-remove-application]')){
  removedApplication=applications[id];delete applications[id];writeLocal(applicationsKey,applications);$('#tracker-status').innerHTML='Application removed. <button type="button" class="text-button" id="undo-application">Undo</button>';render();
 }
});
$('#tracker-status').addEventListener('click',e=>{if(e.target.closest('#undo-application')&&removedApplication){applications[removedApplication.id]=removedApplication;removedApplication=null;writeLocal(applicationsKey,applications);$('#tracker-status').textContent='Application restored.';render()}});
$('#export-tracker').addEventListener('click',()=>{
 const blob=new Blob([trackerCSV(Object.values(applications))],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='path49-applications-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function acknowledgeAlerts(ids){alertSettings.read=[...new Set([...alertSettings.read,...ids])].slice(-8000);writeLocal(alertsKey,alertSettings);renderStudentTools()}
$('#read-alerts').addEventListener('click',()=>{alertSettings.baseline=liveRoles.map(r=>String(r.id));acknowledgeAlerts(activeAlerts.map(a=>a.id))});
$('#alert-list').addEventListener('click',e=>{const button=e.target.closest('[data-read-alert]');if(button)acknowledgeAlerts([button.dataset.readAlert])});
$('#more-alerts').addEventListener('click',()=>{alertLimit+=20;renderStudentTools()});
for(const id of ['alert-scope','alert-days'])$('#'+id).addEventListener('change',()=>{alertSettings.scope=$('#alert-scope').value;alertSettings.days=Number($('#alert-days').value);writeLocal(alertsKey,alertSettings);renderStudentTools()});
function openCatalogueRole(id){
 const role=allRoles().find(r=>r.id===String(id));if(!role){toast('This role is no longer in the active catalogue. Check its original posting.');return;}
 resetFilters();state.kind='all';$('#opportunity-kind').value='all';state.query=role.title.replace(/"/g,'');$('#search-input').value=state.query;
 const broad=role.careerPath==='Broader management / leadership';
 const rows=broad?sortRoles(allRoles().filter(r=>r.careerPath==='Broader management / leadership'&&matchesAdvanced(r,state))):filteredRoles();
 const index=rows.findIndex(r=>r.id===role.id);if(broad)state.broadPage=Math.floor(Math.max(0,index)/20)+1;else state.page=Math.floor(Math.max(0,index)/state.pageSize)+1;
 render();location.hash=broad?'#broader-internships':'#opportunities';$(broad?'#broader-role-list':'#role-list').scrollIntoView({behavior:'smooth',block:'start'});
}
window.addEventListener('storage',event=>{if(event.key===applicationsKey){applications=readLocal(applicationsKey,{});render()}});

const API_BASE=(isSociology?'':window.FIELDNOTE_API_URL||'').replace(/\/$/,'');
function loadFeed(){lastFeedAttempt=Date.now();return Promise.all([PROFILE.rulesUrl,...(isSociology?[]:['./program-eligibility.json'])].map(url=>fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Eligibility rules unavailable');return r.json()}))).then(([rules,programRules={}])=>{eligibilityRules=rules;programEligibility=programRules;return fetch(API_BASE?`${API_BASE.replace(/\/$/,'')}/opportunities?limit=2000`:PROFILE.feedUrl,{cache:'no-store'});}).then(r=>{if(!r.ok)throw new Error(`Feed request failed: ${r.status}`);return r.json()}).then(async data=>{
if(API_BASE && Number.isFinite(data.total)){
 const combined=[...(data.roles||[])];
 while(combined.length<data.total){const response=await fetch(`${API_BASE.replace(/\/$/,'')}/opportunities?limit=2000&offset=${combined.length}`,{cache:'no-store'});if(!response.ok)throw Error('Incomplete API feed');const page=await response.json();if(!page.roles?.length)throw Error('Incomplete API feed');combined.push(...page.roles);}
 data.roles=combined;
}
resumeAnalysisCache.clear();liveRoles=(data.roles||[]).map(r=>({...r,opportunityKind:opportunityKind(r.title,r.description||'',eligibilityRules)})).filter(r=>r.opportunityKind&&listingStatus(r).state!=='closed');feedUpdatedAt=data.updatedAt||new Date().toISOString();feedCoverage=data.sourceCoverage||null;liveFeedLoaded=true;liveFeedError=false;initializeAlertBaseline();render()}).catch(()=>{liveFeedLoaded=true;liveFeedError=true;render()});}
loadFeed();
window.setInterval?.(()=>{if(document.visibilityState==='visible')loadFeed()},15*60*1000);
window.addEventListener('focus',()=>{if(Date.now()-lastFeedAttempt>5*60*1000)loadFeed()});
function clearResume(){
 resumeRequest++;
 resumeText='';resumeEvidence={};resumeProfile={};resumeAnalysisCache.clear();state.resumeSkills=new Set();
 $('#resume-input').value='';$('#resume-profile-form').reset();$('#profile-status').textContent='';$('#resume-review-fields').classList.add('hidden');
 $('#upload-title').textContent='Drop your resume here';$('#upload-sub').textContent='PDF, DOCX or text · up to 10 MB';$('#upload-status').textContent='Resume and profile cleared from this page.';render();
}
$('#clear-resume').addEventListener('click',clearResume);
$('#resume-profile-form').addEventListener('submit',e=>{
 e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;
 resumeProfile=Object.fromEntries(['major','school','enrollment','graduation','gpa','availability','certifications'].map(key=>[key,form.elements.namedItem(key).value.trim()]));
 resumeAnalysisCache.clear();render();$('#profile-status').textContent='Profile applied to each role’s requirements review. Values stay in this page until you clear or reload it.';
});
async function processResume(file){
 const request=++resumeRequest;
 const status=$('#upload-status'),ext=file.name.split('.').pop().toLowerCase();
 if(file.size>10*1024*1024){status.textContent='That file is over 10 MB. Please choose a smaller one.';return}
 if(!['txt','pdf','docx'].includes(ext)){status.textContent='Please use PDF, DOCX or text. Older .doc files are not supported.';return}
 status.textContent='Reading your resume on this device…';let text='';
 try{
  if(ext==='txt')text=await file.text();
  else if(ext==='pdf'){
   if(!window.pdfjsLib)throw Error('The PDF reader is unavailable. Try a text resume.');
   const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
   try{for(let page=1;page<=pdf.numPages;page++){const content=await (await pdf.getPage(page)).getTextContent();text+='\n'+content.items.map(i=>i.str).join(' ');}}finally{await pdf.destroy();}
  }else{
   if(!window.mammoth)throw Error('The DOCX reader is unavailable. Try a text resume.');
   text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
  }
  if(!text.trim()||text.replace(/[^a-z]/gi,'').length<30)throw Error('No readable resume text found. Scanned PDFs need a text version or a DOCX file.');
 }catch(error){if(request!==resumeRequest)return;status.textContent=(error.message||'Could not read this file. Try a text resume.')+(resumeText?' Your previous resume is still active.':'');return}
 if(request!==resumeRequest)return;
 resumeText=text;resumeEvidence=skillEvidence(text,skillAliases);state.resumeSkills=new Set(Object.keys(resumeEvidence));resumeProfile={};resumeAnalysisCache.clear();
 const facts=resumeFacts(text),form=$('#resume-profile-form');form.reset();
 for(const key of ['major','gpa'])if(facts[key])form.elements.namedItem(key).value=facts[key].value;
 $('#resume-review-fields').classList.remove('hidden');$('#profile-status').textContent='Review any detected facts and add what the resume cannot establish. Blank fields stay unknown.';
 $('#upload-title').textContent=file.name;$('#upload-sub').textContent=`${(file.size/1024).toFixed(0)} KB · read locally`;
 status.textContent=`${state.resumeSkills.size} skill areas found. Requirements reviews are now available on each role. No qualification or acceptance probability is calculated.`;
 render();
}
if(state.location){$('#location-input').value=state.location;$('#opportunity-kind').value=state.kind;}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#search-input').focus()}if(e.key==='Escape'){$('#search-input').blur();$('#location-input').blur()}});render();

fetch('./local-programs.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Local program feed unavailable');return r.json()}).then(data=>{
  $('#local-program-list').innerHTML=(data.programs||[]).map(p=>`<article class="program-card"><div><span class="program-type">LOCAL PROGRAM LEAD</span><h3>${esc(p.title)}</h3><b>${esc(p.org)}</b><p>${esc(p.status)}</p><small>${esc(p.eligibility)}</small><p>Page checked ${esc(new Date(p.lastChecked||p.lastAttemptAt).toLocaleDateString())}</p></div><a href="${safeUrl(p.url)}" target="_blank" rel="noopener noreferrer">Check program status ↗</a></article>`).join('');
}).catch(()=>{$('#local-program-list').textContent='Local program checks are unavailable. Please check again later.'});
