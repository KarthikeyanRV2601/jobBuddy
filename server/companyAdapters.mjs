import {plainText,isoDate} from './careerText.mjs';
const SIZE=15;
export const usesFullFeed = company => ['greenhouse','lever','ashby'].includes(company.adapter);
export function catalogRequest(company,query,offset) {
  if(!company) throw new Error('Unknown company.');
  let url; let options={};
  switch(company.adapter) {
    case 'greenhouse': url=new URL(`https://boards-api${company.region==='eu'?'.eu':''}.greenhouse.io/v1/boards/${encodeURIComponent(company.board)}/jobs`); break;
    case 'lever':url=new URL(`https://api.lever.co/v0/postings/${encodeURIComponent(company.board)}?mode=json`);break;
    case 'ashby':url=new URL(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.board)}`);break;
    case 'workday':
      url=new URL(`https://${company.board}/wday/cxs/${encodeURIComponent(company.tenant)}/${encodeURIComponent(company.site)}/jobs`);
      options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({appliedFacets:{},limit:SIZE,offset,searchText:query})};break;
    case 'smartrecruiters':
      url=new URL(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company.board)}/postings`);
      for(const [key,value] of Object.entries({limit:String(SIZE),offset:String(offset),q:query}))url.searchParams.set(key,value);break;
    case 'eightfold':
      url=new URL(`https://${company.host}/api/pcsx/search`);
      for(const [key,value] of Object.entries({domain:company.domain,query,start:String(offset),num:'10'}))url.searchParams.set(key,value);break;
    case 'amazon':
      url=new URL('https://www.amazon.jobs/en/search.json');
      for(const [key,value] of Object.entries({base_query:query,offset:String(offset),result_limit:String(SIZE)}))url.searchParams.set(key,value);break;
    default:throw new Error('This company uses its official career site.');
  }
  return {url,options};
}
function jobUrl(value,company,extraHosts=[]) {
  const url=new URL(value,company.careerUrl);
  const careerHost=new URL(company.careerUrl).hostname;
  const allowed=new Set([careerHost,careerHost.replace(/^www\./,''),company.board,company.host,...(company.allowedJobHosts??[]),...extraHosts].filter(Boolean));
  if(url.protocol!=='https:' || url.username || url.password || !allowed.has(url.hostname))throw new Error('Career site returned an unexpected job link.');
  return url.href;
}
const assertList = (list,company) => {if(!Array.isArray(list))throw new Error(`${company.name} changed its search response. Use its career-site link.`);return list;};
const locations = value => Array.isArray(value) ? value.map(plainText).filter(Boolean).join(' · ') : plainText(value);
function normalize(company,entry) {
  return {...entry,id:`${company.id}:${entry.id}`,company:company.id,title:plainText(entry.title),location:plainText(entry.location)||'Location not listed',summary:plainText(entry.summary).slice(0,12000),postedAt:entry.postedAt?isoDate(entry.postedAt):'',workplace:plainText(entry.workplace)};
}
export function parseCatalog(company,payload,query,offset) {
  let jobs; let total;
  switch(company.adapter) {
    case 'greenhouse':
      jobs=assertList(payload?.jobs,company).map(job=>normalize(company,{id:job.id,title:job.title,location:job.location?.name,summary:(job.departments??[]).map(d=>d.name).join(' · '),url:jobUrl(job.absolute_url,company,['boards.greenhouse.io','job-boards.greenhouse.io','job-boards.eu.greenhouse.io','boards.eu.greenhouse.io']),postedAt:job.first_published??'',workplace:'',evidence:'Title, department, and location from public job board'}));break;
    case 'lever':
      jobs=assertList(payload,company).map(job=>normalize(company,{id:job.id,title:job.text,location:[job.categories?.location,...(job.categories?.allLocations??[])].filter(Boolean).join(' · '),summary:job.descriptionPlain??job.categories?.department??'',url:jobUrl(job.hostedUrl,company,['jobs.lever.co','jobs.eu.lever.co']),postedAt:'',workplace:job.workplaceType??'',evidence:'Public job-board description'}));break;
    case 'ashby':
      jobs=assertList(payload?.jobs,company).filter(job=>job.isListed!==false).map(job=>normalize(company,{id:job.id,title:job.title,location:[job.location,...(job.secondaryLocations??[]).map(l=>l.location)].filter(Boolean).join(' · '),summary:job.descriptionPlain??job.descriptionHtml??job.department??'',url:jobUrl(job.jobUrl,company,['jobs.ashbyhq.com']),postedAt:job.publishedAt??'',workplace:job.workplaceType??(job.isRemote?'Remote':''),evidence:'Public job-board description'}));break;
    case 'workday':
      jobs=assertList(payload?.jobPostings,company).map(job=>normalize(company,{id:job.bulletFields?.[0]??job.externalPath,title:job.title,location:job.locationsText,summary:job.postedOn??'',url:jobUrl(`https://${company.board}/en-US/${company.site}${job.externalPath}`,company),postedAt:'',workplace:'',evidence:'Title and location summary; multiple-location listings need verification'}));total=Number(payload.total);break;
    case 'smartrecruiters':
      jobs=assertList(payload?.content,company).filter(job=>!job.visibility||job.visibility==='PUBLIC').map(job=>normalize(company,{id:job.id,title:job.name,location:job.location?.fullLocation??[job.location?.city,job.location?.country].filter(Boolean).join(', '),summary:job.department?.label??job.function?.label??'',url:jobUrl(`https://jobs.smartrecruiters.com/${company.board}/${encodeURIComponent(job.id)}`,company,['jobs.smartrecruiters.com']),postedAt:job.releasedDate??'',workplace:job.location?.remote?'Remote':job.location?.hybrid?'Hybrid':'',evidence:'Title, department, and location from public search'}));total=Number(payload.totalFound);break;
    case 'eightfold':
      jobs=assertList(payload?.data?.positions,company).map(job=>normalize(company,{id:job.id,title:job.name,location:locations(job.locations),summary:job.department??'',url:jobUrl(new URL(job.positionUrl??`/careers/job/${job.id}`,`https://${company.host}`).href,company),postedAt:job.postedTs?job.postedTs*1000:'',workplace:job.workLocationOption??'',evidence:'Title, department, and location from public search'}));total=Number(payload.data.count);break;
    case 'amazon':
      jobs=assertList(payload?.jobs,company).map(job=>normalize(company,{id:job.id_icims??job.id,title:job.title,location:job.location??[job.city,job.country_code].filter(Boolean).join(', '),summary:[job.description,job.basic_qualifications].filter(Boolean).join(' '),url:jobUrl(job.job_path??`/en/jobs/${job.id_icims}`,company,['www.amazon.jobs','amazon.jobs']),postedAt:job.posted_date??'',workplace:'',evidence:'Career-site job description and qualifications'}));total=Number(payload.hits);break;
    default:throw new Error('Unsupported automatic search configuration.');
  }
  jobs=jobs.filter(job=>job.title&&!job.id.endsWith(':undefined'));
  if(usesFullFeed(company)) {
    const words=query.toLowerCase().split(/\s+/).filter(Boolean);
    jobs=jobs.filter(job=>words.every(word=>`${job.title} ${job.summary}`.toLowerCase().includes(word)));
    jobs=[...new Map(jobs.map(job=>[job.id,job])).values()];
    total=jobs.length;return {jobs:jobs.slice(offset,offset+SIZE),total,nextCursor:offset+SIZE<total?offset+SIZE:null};
  }
  if(!Number.isFinite(total))throw new Error(`${company.name} did not return a valid results count.`);
  const next=offset+(company.adapter==='eightfold'?10:SIZE);
  return {jobs,total,nextCursor:jobs.length>0&&next<total?next:null};
}
