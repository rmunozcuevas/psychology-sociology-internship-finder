// Public employer career APIs; registry-controlled HTTPS origins only.
export async function jibeJobs(board,get){
 const base=new URL(board.url);if(base.protocol!=='https:')throw Error('HTTPS career site required');
 const jobs=new Map();let scanned=0;
 for(const keywords of board.searches||['intern']){
  const seen=new Set();
  for(let page=1;page<=30;page++){
   const url=new URL('/api/jobs',base);url.search=new URLSearchParams({keywords,limit:'100',page:String(page)});
   const data=await get(url.href);if(!Array.isArray(data.jobs)||!Number.isFinite(data.totalCount))throw Error('Invalid employer career response');
   let fresh=0;
   for(const item of data.jobs){const j=item.data;if(!j?.req_id)throw Error('Missing requisition ID');if(!seen.has(j.req_id)){seen.add(j.req_id);fresh++;}jobs.set(j.req_id,j);}
   if(seen.size>=data.totalCount||!data.jobs.length)break;
   if(!fresh||page===30)throw Error('Incomplete career pagination');
  }
  scanned+=seen.size;
 }
 return {scanned:jobs.size,jobs:[...jobs.values()].filter(j=>j.applyable!==false&&j.external!==false&&j.searchable!==false).map(j=>({title:j.title,company:board.employer,location:j.full_location||[j.city,j.state,j.country].filter(Boolean).join(', '),url:new URL(`/jobs/${encodeURIComponent(j.slug||j.req_id)}`,base).href,description:[j.description,j.qualifications,j.responsibilities].filter(Boolean).join(' '),date:j.posted_date,deadline:j.posting_expiry_date,source:'Employer careers API'}))};
}
