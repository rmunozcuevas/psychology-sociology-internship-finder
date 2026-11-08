// Same employer requisition can be linked through several locales or tracking URLs.
export function postingKey(value){
 try {
  const u=new URL(value);u.hash='';
  const parts=u.pathname.split('/').filter(Boolean);
  const greenhouseId=u.searchParams.get('gh_jid') || (/greenhouse\.io$/.test(u.hostname)&&u.pathname.includes('job_app')?u.searchParams.get('token'):null);
  if(greenhouseId && /^\d+$/.test(greenhouseId))return `greenhouse:${greenhouseId}`;
  if(/(^|\.)greenhouse\.io$/.test(u.hostname)){const id=parts[parts.indexOf('jobs')+1];if(/^\d+$/.test(id))return `greenhouse:${id}`;}
  if(/(^|\.)lever\.co$/.test(u.hostname)&&parts.length>1)return `lever:${parts[0]}:${parts[1]}`;
  if(u.hostname==='jobs.ashbyhq.com'&&parts.length>1)return `ashby:${parts[0]}:${parts[1]}`;
  if(u.hostname.endsWith('.myworkdayjobs.com')){const req=parts.at(-1)?.match(/_([^_]+)$/)?.[1]?.replace(/-\d+$/,'');if(req)return `workday:${u.hostname==='aah.wd115.myworkdayjobs.com'?'aah.wd5.myworkdayjobs.com':u.hostname}:${req}`;}
  if(u.hostname==='jobs.smartrecruiters.com'&&parts[0]==='oneclick-ui'){
    const company=parts[parts.indexOf('company')+1],publication=parts[parts.indexOf('publication')+1];
    if(company&&publication)return `smartrecruiters:${company.toLowerCase()}:${publication}`;
  }
  if(u.hostname==='jobs.smartrecruiters.com'&&parts.length>1&&/^\d+/.test(parts[1]))return `smartrecruiters:${parts[0].toLowerCase()}:${parts[1].split('-')[0]}`;
  for(const key of [...u.searchParams.keys()])if(/^(utm_|gh_src|source|ref|tracking|trid)/i.test(key))u.searchParams.delete(key);
  return u.href.replace(/\/$/,'');
 }catch{return value}
}
