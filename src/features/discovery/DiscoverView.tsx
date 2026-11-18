import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Application } from '../../types/application';
import { COMPANY_CATALOG, COMPANY_BY_ID, COMPANY_LABELS, type CareerCompany, type CareerJob, type CareerProviderResult, type DiscoveryProfile } from '../../types/discovery';
import { careerJobToApplication, DEFAULT_DISCOVERY_PROFILE, DISCOVERY_PROFILE_KEY, getDiscoveryQuery, getJobMatch, isCareerSaved, isDiscoveryProfile, searchCareers } from '../../utils/discovery';
import { readJson, writeJson } from '../../utils/storage';
import { CompanyPicker } from './CompanyPicker';
import './discovery.css';

type DiscoverViewProps = {
  readonly applications: readonly Application[];
  readonly onSave: (application: Application) => void;
};
export const DiscoverView = ({ applications, onSave }: DiscoverViewProps) => {
  const [profile, setProfile] = useState<DiscoveryProfile>(()=>readJson(localStorage,DISCOVERY_PROFILE_KEY,DEFAULT_DISCOVERY_PROFILE,isDiscoveryProfile));
  const [searchedProfile, setSearchedProfile] = useState<DiscoveryProfile | null>(null);
  const [providers, setProviders] = useState<readonly CareerProviderResult[]>([]);
  const [loading, setLoading] = useState<readonly CareerCompany[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [companyFilter, setCompanyFilter] = useState<CareerCompany | 'all'>('all');
  const busy = useRef(false);
  const abortSearch = useRef<AbortController | null>(null);
  const [resultCategory,setResultCategory] = useState<'all'|'product'|'startup'>('all');
  const update = (patch: Partial<DiscoveryProfile>): void => setProfile(current=>({...current,...patch}));
  const jobs = useMemo(()=> {
    const unique = new Map<string,CareerJob>();
    providers.forEach(provider=>provider.jobs.forEach(job=>unique.set(job.id,job)));
    return [...unique.values()].filter(job=>(companyFilter==='all' || job.company===companyFilter)&&(resultCategory==='all'||COMPANY_BY_ID[job.company]?.category===resultCategory))
      .sort((a,b)=>getJobMatch(b,searchedProfile ?? profile).score - getJobMatch(a,searchedProfile ?? profile).score || a.title.localeCompare(b.title));
  },[providers,companyFilter,searchedProfile,profile,resultCategory]);
  const run = async (company?: CareerCompany): Promise<void> => {
    if (busy.current) return;
    const searchProfile = company ? searchedProfile : profile;
    if (!searchProfile) return;
    const companies = company ? [company] : searchProfile.companies;
    if (!companies.length || !getDiscoveryQuery(searchProfile)) {setError('Select a company and enter a preferred role or at least one skill.');return;}
    busy.current=true;setLoading(companies);setError('');setNotice('');
    const controller=new AbortController();abortSearch.current=controller;
    if(!company) {setProviders([]);setSearchedProfile({...searchProfile});setCompanyFilter('all');setResultCategory('all');}
    try {
      try {writeJson(localStorage,DISCOVERY_PROFILE_KEY,profile);} catch {setNotice('Your browser could not save your preferences. Search will still run.');}
      const previous = company ? providers.find(item=>item.company===company) : undefined;
      const cursors = company ? {[company]:previous?.nextCursor ?? 0} : {};
      await searchCareers(searchProfile,companies,cursors,{signal:controller.signal,onBatch:(response)=>{
        if(!company) setProviders(current=>[...current,...response.providers]);
        else setProviders(current=>current.map(existing=>{
          const next=response.providers.find(item=>item.company===existing.company);
          if(!next)return existing;
          if(next.error)return {...existing,error:next.error};
          const merged=new Map([...existing.jobs,...next.jobs].map(job=>[job.id,job]));
          return {...next,jobs:[...merged.values()]};
        }));
        setLoading(current=>current.filter(id=>!response.providers.some(provider=>provider.company===id)));
      }});
    } catch (cause) {
      if(controller.signal.aborted)setNotice('Search stopped. Completed results are kept; unsearched companies can be searched on your next click.');
      else setError(cause instanceof Error ? cause.message : 'Search could not finish. Try again.');
    } finally {busy.current=false;setLoading([]);abortSearch.current=null;}
  };
  const submit = (event: FormEvent<HTMLFormElement>): void => {event.preventDefault();void run();};
  const save = (job: CareerJob): void => {
    if (isCareerSaved(applications,job)) return;
    try {onSave(careerJobToApplication(job,searchedProfile ?? profile));setNotice(`${job.title} saved to Tracker as a Lead.`);} catch {setError('This browser could not save the role. Check local storage and try again.');}
  };
  const totalLoaded = providers.reduce((total,provider)=>total+provider.jobs.length,0);
  return (
    <section aria-labelledby="discover-title" className="discover-view">
      <header className="discover-hero">
        <div><p className="eyebrow">LESS SCROLLING. MORE POSSIBILITY.</p><h2 id="discover-title">Good work.<br /><span>Great fit.</span></h2><p>Your next move, straight from the companies on your list.</p></div>
        <div className="discovery-sticker" aria-hidden="true">↗</div>
        <div className="discovery-hero-note"><strong>{COMPANY_CATALOG.length} companies.<br />Your kind of role.</strong><span>Fresh searches. Only when you click.</span></div>
      </header>
      <div className="discovery-layout">
        <form className="discovery-profile" onSubmit={submit}>
          <div className="discovery-section-heading"><span className="discovery-step">01</span><div><p className="eyebrow">THE STARTING POINT</p><h3>Your career DNA</h3></div></div>
          <fieldset disabled={loading.length>0}>
            <legend className="sr-only">Expertise and company preferences</legend>
            <label>Preferred role<input value={profile.role} onChange={event=>update({role:event.target.value})} maxLength={100} placeholder="e.g. Software Engineer" /></label>
            <label>Your skills<textarea value={profile.skills} onChange={event=>update({skills:event.target.value})} maxLength={1000} placeholder="React, TypeScript, Java, SQL" rows={3} /><span className="discovery-field-note">Separate skills with commas. Used to rank results.</span></label>
            <div className="discovery-field-pair"><label>Location preference<input value={profile.location} onChange={event=>update({location:event.target.value})} maxLength={100} placeholder="e.g. India" /></label><label>Experience (years)<input value={profile.experience} onChange={event=>update({experience:event.target.value})} type="number" min="0" max="60" step="0.5" placeholder="e.g. 5" /></label></div>
            <label className="discovery-check"><input type="checkbox" checked={profile.remote} onChange={event=>update({remote:event.target.checked})} /> Prefer remote listings</label>
            <p className="discovery-field-note">Location and remote preferences boost matching listings; they do not exclude other roles. Experience requirements must be verified on the listing.</p>
            <CompanyPicker selected={profile.companies} onChange={(companies)=>update({companies})} />
          </fieldset>
          <button className="primary-action discovery-search" type="submit" disabled={loading.length>0}>{loading.length ? `${loading.length} companies remaining…` : `Search ${profile.companies.length} companies ↗`}</button>
          {loading.length>0?<button className="discovery-stop" type="button" onClick={()=>abortSearch.current?.abort()}>Stop search · keep results</button>:null}
          <p className="discovery-privacy">Your role keyword goes to the selected career sites. Skills, experience, and location preferences stay in this browser. No background searches.</p>
        </form>
        <div className="discovery-results">
          <div className="discovery-results-heading"><div><p className="eyebrow">THE POSSIBILITY PILE</p><h3>{searchedProfile ? `${totalLoaded} roles to explore` : 'Let’s find your next.'}</h3></div>{searchedProfile ? <span className="discovery-keyword">Search: {getDiscoveryQuery(searchedProfile)}</span> : null}</div>
          {error ? <p className="discovery-error" role="alert">{error}</p> : null}
          {notice ? <p className="discovery-notice" role="status">{notice}</p> : null}
          <p className="discovery-company-summary">{profile.companies.filter(id=>COMPANY_BY_ID[id]?.adapter!=='direct').length} automatic · {profile.companies.filter(id=>COMPANY_BY_ID[id]?.adapter==='direct').length} career-site links · India-focused directory</p>
          {searchedProfile || loading.length>0 ? <details className="discovery-provider-details" open={loading.length>0 || providers.some(provider=>provider.error!==null)}><summary>Status &amp; career-site links · {providers.length}/{searchedProfile?.companies.length??profile.companies.length} completed</summary><div className="discovery-provider-grid" aria-label="Career site search status">{(searchedProfile?.companies ?? profile.companies).map(company=> {
            const provider = providers.find(item=>item.company===company);
            return <article className={`discovery-provider ${company}`} key={company}><span className="company-monogram" aria-hidden="true">{COMPANY_LABELS[company]?.[0] ?? company[0]}</span><strong>{COMPANY_LABELS[company]}</strong><span>{loading.includes(company) ? (loading.slice(0,4).includes(company) ? 'Searching…' : 'Queued') : !provider ? 'Ready when you are' : provider.error ? 'Needs a retry' : provider.mode==='direct' ? 'Open official career site' : `${provider.jobs.length} loaded · ${provider.total ?? '—'} found`}</span>{provider ? <><small>{provider.mode==='direct' ? 'Configured' : provider.cached ? 'Cached' : 'Fetched'} {new Date(provider.fetchedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>{provider.error ? <p role="alert">{provider.error}</p> : null}<div className="provider-actions">{provider.mode==='direct'?null:provider.error || provider.nextCursor!==null ? <button type="button" disabled={loading.length>0} onClick={()=>void run(company)}>{provider.error ? `Retry ${COMPANY_LABELS[company]}` : `More from ${COMPANY_LABELS[company]}`}</button> : <small>All results loaded</small>}<a href={provider.searchUrl} target="_blank" rel="noreferrer">Career site ↗</a></div></> : null}</article>;
          })}</div></details>:null}
          {searchedProfile ? <><div className="discovery-result-controls"><label>Company type<select value={resultCategory} onChange={event=>setResultCategory(event.target.value as 'all'|'product'|'startup')}><option value="all">All types</option><option value="product">Product companies</option><option value="startup">Startups &amp; scaleups</option></select></label><label>Show company<select value={companyFilter} onChange={event=>setCompanyFilter(event.target.value as CareerCompany|'all')}><option value="all">All searched companies</option>{searchedProfile.companies.map(company=><option key={company} value={company}>{COMPANY_LABELS[company]}</option>)}</select></label><p>Ranked by keyword overlap in the loaded pages. Match signals are not an eligibility assessment.</p></div><div className="discovery-job-grid" aria-live="polite">{jobs.map(job=> {
            const match=getJobMatch(job,searchedProfile);const saved=isCareerSaved(applications,job);
            return <article className="discovery-job" key={job.id}><div className="discovery-job-top"><span className={`discovery-company-label ${job.company}`}>{COMPANY_LABELS[job.company]} · {COMPANY_BY_ID[job.company]?.category==='startup'?'Startup / scaleup':'Product'}</span><span className="discovery-match">{match.score>0 ? `${match.reasons.length} match ${match.reasons.length===1 ? 'signal' : 'signals'}` : 'Worth exploring'}</span></div><h4><a href={job.url} target="_blank" rel="noreferrer">{job.title}</a></h4><div className="discovery-job-meta"><span>◎ {job.location}</span>{job.workplace ? <span>{job.workplace}</span> : null}{job.postedAt ? <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span> : null}</div>{job.summary ? <p className="discovery-job-summary">{job.summary.slice(0,280)}{job.summary.length>280 ? '…' : ''}</p> : null}<ul className="discovery-reasons">{match.reasons.slice(0,4).map(reason=><li key={reason}>{reason}</li>)}</ul><p className="discovery-evidence">{job.evidence}. Confirm skills, experience, and availability in the full listing.</p><div className="discovery-job-actions"><a href={job.url} target="_blank" rel="noreferrer">View role ↗</a><button type="button" disabled={saved} onClick={()=>save(job)}>{saved ? '✓ In your tracker' : '+ Save to tracker'}</button></div></article>;
          })}</div>{!jobs.length && !loading.length ? <div className="discovery-empty"><span aria-hidden="true">↗</span><h4>No roles here yet.</h4><p>{providers.every(provider=>provider.error) ? 'The career sites could not return results. Retry a company above or use its career-site link.' : 'Try a broader role keyword, another company, or open the company-status section for more results and official career-site links.'}</p></div> : null}</> : <div className="discovery-empty"><span aria-hidden="true">✳</span><h4>Your next chapter has an opening.</h4><p>Tell us what you do, pick your companies, and hit Search careers. Real listings. No endless tabs.</p><div className="discovery-how"><span>01 · Your expertise</span><span>02 · Career-site search</span><span>03 · Save your next move</span></div></div>}
        </div>
      </div>
    </section>
  );
};
