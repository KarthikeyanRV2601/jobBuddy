import { useMemo, useState } from 'react';
import { COMPANY_CATALOG, type CareerCompany, type CompanyCategory } from '../../types/discovery';

type Props = {readonly selected: readonly CareerCompany[]; readonly onChange:(companies:readonly CareerCompany[])=>void;};
export const CompanyPicker = ({selected,onChange}:Props) => {
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState<CompanyCategory|'all'>('all');
  const [automaticOnly,setAutomaticOnly]=useState(false);
  const visible=useMemo(()=>COMPANY_CATALOG.filter(company=>(category==='all'||company.category===category)&&(!automaticOnly||company.adapter!=='direct')&&company.name.toLowerCase().includes(query.trim().toLowerCase())),[query,category,automaticOnly]);
  const count=(type:CompanyCategory)=>COMPANY_CATALOG.filter(company=>company.category===type).length;
  return <div className="company-directory">
    <div className="company-directory-heading"><strong>Companies on your radar</strong><span>{selected.length} selected</span></div>
    <div className="company-category-tabs" aria-label="Company categories">{([['all','All',COMPANY_CATALOG.length],['product','Product',count('product')],['startup','Startups',count('startup')]] as const).map(([value,label,total])=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)}>{label}<span>{total}</span></button>)}</div>
    <label className="company-directory-search">Find a company<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Google, Glean, Razorpay…" /></label>
    <label className="discovery-check"><input type="checkbox" checked={automaticOnly} onChange={event=>setAutomaticOnly(event.target.checked)} /> Automatic search only</label>
    <div className="company-directory-tools"><span>{visible.length} of {COMPANY_CATALOG.length} shown</span><button type="button" onClick={()=>onChange([...new Set([...selected,...visible.map(company=>company.id)])])}>Select shown</button><button type="button" onClick={()=>onChange([])}>Clear</button></div>
    <div className="company-directory-list" aria-label="Company directory" tabIndex={0}>
      {visible.map(company=><div className="company-directory-row" key={company.id}>
        <label title={`${company.name} · ${company.category==='startup'?'Startup / scaleup':'Product company'} · ${company.adapter==='direct'?'Official career site':'Automatic search'}`}><input type="checkbox" checked={selected.includes(company.id)} onChange={event=>onChange(event.target.checked?[...new Set([...selected,company.id])]:selected.filter(id=>id!==company.id))} /><span>{company.name}</span></label>
        <span className={`directory-mode ${company.adapter==='direct'?'is-direct':''}`}>{company.adapter==='direct'?'Site':'Auto'}</span>
        <a href={company.researchUrl} target="_blank" rel="noreferrer" aria-label={`Research for ${company.name}`} title={company.researchBasis}>↗</a>
      </div>)}
      {!visible.length?<p className="company-directory-empty">No matching companies. Try another name or category.</p>:null}
    </div>
    <p className="discovery-field-note">Auto retrieves listings here. Site opens the official careers page. All {COMPANY_CATALOG.length} companies remain available through search and scrolling.</p>
    <details className="company-research"><summary>India pay research &amp; categories</summary><p>Checked 19 Nov 2026. Pay-focused targets use India software-engineering compensation reports; this is not a salary ranking or a guarantee of open India roles. Additional product targets and your existing selections are included.</p><p>Product means established product businesses. Startups includes growth-stage scaleups; these editorial groups do not imply a company is privately held. Remote eligibility must be verified in each listing.</p><a href="https://www.levels.fyi/leaderboard/Software-Engineer/All-Levels/country/India/" target="_blank" rel="noreferrer">India compensation research ↗</a></details>
  </div>;
};
