import {deadlineTime} from '../listing-quality.mjs';
// Public employer postings only. Full descriptions are required for eligibility screening.
export async function workdayJobs(raw, get, relevant, searches=['"intern"','internship']) {
  const [host, tenant, site] = raw.split('|');
  if (!host?.endsWith('.myworkdayjobs.com') || !tenant || !site) throw Error('Invalid Workday board');
  const base = `https://${host}/wday/cxs/${tenant}/${site}`;
  const postingMap=new Map();
  const paginationErrors=[];
  const startedAt=Date.now();
  // Quoted intern plus internship avoids substring matches such as internal medicine.
  for(const searchText of searches) {
    let total=null;
    const querySeen=new Set();
    for (let offset=0; offset<1000; offset+=20) {
      if(Date.now()-startedAt>120000){paginationErrors.push(`Partial ${searchText} search: source time budget reached`);break;}
      const data=await get(`${base}/jobs`, {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({limit:20,offset,searchText})});
      if(total===null && data.total>0) total=data.total;
      if(!Array.isArray(data.jobPostings))throw Error('Invalid Workday jobs response');
      const page=data.jobPostings;
      const before=querySeen.size;
      for(const job of page){postingMap.set(job.externalPath,job);querySeen.add(job.externalPath);}
      if(offset>0 && page.length && querySeen.size===before){paginationErrors.push(`Partial ${searchText} search: repeated pagination`);break;}
      if(offset+page.length>=1000 && total>1000)paginationErrors.push(`Partial ${searchText} search: ${total} results exceed per-query budget`);
      if (!page.length || (total!==null && offset+page.length >= total) || page.length<20) break;
    }
  }
  const postings=[...postingMap.values()];
  const candidates=postings.filter(j=>relevant(j.title));
  const jobs=[], errors=[...paginationErrors];
  let next=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(next<candidates.length) {
      if(Date.now()-startedAt>180000){if(!errors.includes('Partial source: detail time budget reached'))errors.push('Partial source: detail time budget reached');break;}
      const j=candidates[next++];
      try {
        const detail=await get(`${base}${j.externalPath}`);
        const info=detail.jobPostingInfo;
        if(!info || info.canApply===false || info.posted===false) continue;
        if(deadlineTime(info.endDate)!==null && deadlineTime(info.endDate)<Date.now()) continue;
        jobs.push({title:info.title,location:[info.location||info.jobRequisitionLocation?.descriptor||j.locationsText||'',...(info.additionalLocations||[]).map(v=>typeof v==='string'?v:v.descriptor||v.location||'')].filter((v,i,a)=>v&&a.indexOf(v)===i).join('; '),url:info.externalUrl||`https://${host}/en-US/${site}${j.externalPath}`,description:info.jobDescription||'',date:info.startDate,deadline:info.endDate||null,source:'Workday'});
      } catch(e) { errors.push(`${j.title}: ${e.message}`); }
    }
  }));
  return {jobs, errors, scanned:postings.length};
}
