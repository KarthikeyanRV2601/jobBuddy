import type { Application } from '../types/application';
import { CAREER_COMPANIES, COMPANY_BY_ID, COMPANY_LABELS, type CareerCompany, type CareerJob, type CareerProviderResult, type DiscoveryProfile, type DiscoveryResponse } from '../types/discovery';
import { createApplication } from './applications';
export const DISCOVERY_PROFILE_KEY = 'jobbuddy.discoveryProfile.v1';
export const DEFAULT_DISCOVERY_PROFILE: DiscoveryProfile = {role:'',skills:'',location:'',experience:'',remote:false,companies:['oracle','microsoft','sanofi']};
export const isDiscoveryProfile = (value: unknown): value is DiscoveryProfile => {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string,unknown>;
  return ['role','skills','location','experience'].every(key => typeof p[key] === 'string' && (p[key] as string).length <= 1000) && typeof p.remote === 'boolean' && Array.isArray(p.companies) && p.companies.every(c => CAREER_COMPANIES.includes(c));
};
const tokens = (value: string): readonly string[] => [...new Set(value.split(/[,\n]+/).map(s=>s.trim().toLowerCase()).filter(Boolean))];
const contains = (text: string, term: string): boolean => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, 'i').test(text);
};
export const getJobMatch = (job: CareerJob, profile: DiscoveryProfile): {readonly score: number; readonly reasons: readonly string[]} => {
  const text = `${job.title} ${job.summary}`.toLowerCase();
  const matched = tokens(profile.skills).filter(skill=>contains(text,skill));
  const reasons: string[] = matched.map(skill=>`Mentions ${skill}`);
  let score = matched.length * 10;
  const roleWords = profile.role.toLowerCase().split(/\s+/).filter(word=>word.length>2);
  if (roleWords.length && roleWords.every(word=>contains(job.title.toLowerCase(),word))) { score += 20; reasons.push('Preferred role in title'); }
  if (profile.location.trim() && job.location.toLowerCase().includes(profile.location.trim().toLowerCase())) { score += 15; reasons.push(`Location matches ${profile.location.trim()}`); }
  if (profile.remote && /\bremote\b/i.test(`${job.workplace} ${job.location}`)) { score += 10; reasons.push('Remote listed by company'); }
  if (!reasons.length) reasons.push('Returned by the company’s keyword search');
  return {score,reasons};
};
export const getDiscoveryQuery = (profile: DiscoveryProfile): string => profile.role.trim() || tokens(profile.skills)[0] || '';
export const isCareerSaved = (applications: readonly Application[], job: CareerJob): boolean => applications.some(app=>app.id === `career:${job.id}` || app.source === job.url);
export const careerJobToApplication = (job: CareerJob, profile: DiscoveryProfile): Application => createApplication({
  id:`career:${job.id}`,company:COMPANY_LABELS[job.company] ?? job.company,role:job.title,source:job.url,
  sourceMessageId:'',sourceThreadId:'',deadline:'',status:'Lead',nextAction:'Review requirements on the company career site and apply',
  notes:[`Discovered on ${COMPANY_LABELS[job.company]} careers.`, `Location: ${job.location}`, `Original listing: ${job.url}`,job.summary].filter(Boolean).join('\n'),
  skillContext:profile.skills,
},new Date().toISOString());
type SearchOptions = {
  readonly signal?: AbortSignal;
  readonly onBatch?: (batch: DiscoveryResponse) => void;
};
export const searchCareers = async (profile: DiscoveryProfile, companies: readonly CareerCompany[], cursors: Partial<Record<CareerCompany,number>>, options: SearchOptions = {}): Promise<DiscoveryResponse> => {
  const providers: CareerProviderResult[] = [];
  // Small sequential batches keep a large selection from flooding career sites.
  for(let offset=0;offset<companies.length;offset+=4) {
    if(options.signal?.aborted) throw new DOMException('Search stopped.','AbortError');
    const batch=companies.slice(offset,offset+4);
    let result: DiscoveryResponse;
    try {
      const signal=options.signal ? AbortSignal.any([options.signal,AbortSignal.timeout(65000)]) : AbortSignal.timeout(65000);
      const response=await fetch('/api/discover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:getDiscoveryQuery(profile),companies:batch,cursors}),signal});
      if(!response.ok) {const body=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(body?.error??`Search failed (${response.status}).`);}
      result=await response.json() as DiscoveryResponse;
      if(!Array.isArray(result.providers)||result.providers.length!==batch.length)throw new Error('The local career search service returned an invalid response.');
    } catch(error) {
      if(options.signal?.aborted)throw error;
      result={providers:batch.map(company=>({company,jobs:[],total:null,nextCursor:cursors[company]??0,searchUrl:COMPANY_BY_ID[company]?.careerUrl??'',fetchedAt:new Date().toISOString(),cached:false,error:error instanceof Error?error.message:'Search failed. Retry this company.'}))};
    }
    providers.push(...result.providers);options.onBatch?.(result);
  }
  return {providers};
};
