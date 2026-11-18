import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import catalog from '../shared/companies.json' with {type:'json'};
import {catalogRequest,parseCatalog} from '../server/companyAdapters.mjs';
import {createCareerSearch,validateSearch} from '../server/discovery.mjs';
const byId=Object.fromEntries(catalog.map(c=>[c.id,c]));
assert.equal(catalog.length,74);assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
assert.ok(catalog.every(c=>['product','startup'].includes(c.category)&&c.careerUrl.startsWith('https://')&&c.researchUrl.startsWith('https://')));
assert.equal(catalog.filter(c=>c.adapter!=='direct').length,44);
assert.ok(['oracle','microsoft','sanofi'].every(id=>byId[id]));
assert.ok(catalog.filter(c=>c.category==='startup').length>20);
for(const c of catalog.filter(c=>!['direct','oracle','microsoft','sanofi'].includes(c.adapter))) {
 const request=catalogRequest(c,'software',0);assert.equal(request.url.protocol,'https:');assert.ok(!request.url.href.includes('undefined'));
}
assert.throws(()=>validateSearch({companies:catalog.slice(0,5).map(c=>c.id),query:'software'}));
assert.throws(()=>validateSearch({companies:['not-configured'],query:'software'}));
console.log('PASS complete directory, distinct categories, research links, original selections, and bounded requests');
const gh={jobs:Array.from({length:20},(_,i)=>({id:i+1,title:'Software Engineer',location:{name:'India'},departments:[{name:'Engineering'}],absolute_url:`https://boards.greenhouse.io/stripe/jobs/${i+1}`}))};
let parsed=parseCatalog(byId.stripe,gh,'software',0);assert.equal(parsed.jobs.length,15);assert.equal(parsed.nextCursor,15);
const second=parseCatalog(byId.stripe,gh,'software',15);assert.equal(second.jobs.length,5);assert.equal(second.nextCursor,null);
assert.equal(new Set([...parsed.jobs,...second.jobs].map(j=>j.id)).size,20);
assert.equal(parseCatalog(byId.stripe,gh,'physicist',0).total,0);
assert.throws(()=>parseCatalog(byId.stripe,{jobs:[{...gh.jobs[0],absolute_url:'https://evil.example/jobs/1'}]},'software',0),/unexpected/);
assert.throws(()=>parseCatalog(byId.stripe,{},'software',0));
console.log('PASS feed filtering, pagination, deduplication, empty search, and safe job links');
const samples=[
 ['outreach',[{id:1,text:'Software Engineer',categories:{location:'India'},hostedUrl:'https://jobs.lever.co/outreach/1',descriptionPlain:'Build software',workplaceType:'remote'}]],
 ['kognitos',{jobs:[{id:1,title:'Software Engineer',location:'India',jobUrl:'https://jobs.ashbyhq.com/Kognitos/1',descriptionPlain:'Build software',publishedAt:'2026-11-19'}]}],
 ['nvidia',{total:30,jobPostings:[{title:'Software Engineer',externalPath:'/job/India/Test_1',locationsText:'India',bulletFields:['1']}]}],
 ['freshworks',{totalFound:30,content:[{id:1,name:'Software Engineer',location:{fullLocation:'India'},visibility:'PUBLIC'}]}],
 ['qualcomm',{data:{count:30,positions:[{id:1,name:'Software Engineer',locations:['India'],positionUrl:'/careers/job/1'}]}}],
 ['amazon',{hits:30,jobs:[{id_icims:1,title:'Software Engineer',location:'India',description:'Build software',job_path:'/en/jobs/1/engineer'}]}],
];
for(const [id,payload]of samples){parsed=parseCatalog(byId[id],payload,'software',0);assert.equal(parsed.jobs.length,1,id);assert.equal(parsed.jobs[0].company,id);assert.ok(parsed.jobs[0].url.startsWith('https://'));}
assert.equal(catalogRequest(byId.nvidia,'software',15).options.method,'POST');
assert.equal(JSON.parse(catalogRequest(byId.nvidia,'software',15).options.body).offset,15);
console.log('PASS Lever, Ashby, Workday, SmartRecruiters, Eightfold, and Amazon normalization');
let fetches=0;
const search=createCareerSearch({fetcher:async()=>{fetches++;return new Response(JSON.stringify(gh));}});
let result=await search({companies:['google','stripe'],query:'software'});
assert.equal(fetches,1);assert.equal(result.providers[0].mode,'direct');assert.equal(result.providers[0].total,null);assert.equal(result.providers[1].jobs.length,15);
await search({companies:['stripe'],query:'engineer'});assert.equal(fetches,1);
await search({companies:['stripe'],query:'software',cursors:{stripe:15}});assert.equal(fetches,1);
console.log('PASS direct career links stay explicit and board responses are shared across queries and pages');
const out=await mkdtemp(join(tmpdir(),'company-directory-test-'));const original=globalThis.fetch;
try {
 await build({entryPoints:['src/utils/discovery.ts'],bundle:true,platform:'node',format:'esm',outfile:join(out,'utils.mjs')});
 const {searchCareers,isDiscoveryProfile,DEFAULT_DISCOVERY_PROFILE}=await import(join(out,'utils.mjs'));
 assert.ok(isDiscoveryProfile({...DEFAULT_DISCOVERY_PROFILE,companies:['oracle','stripe','glean']}));assert.ok(!isDiscoveryProfile({...DEFAULT_DISCOVERY_PROFILE,companies:['invalid']}));
 const selected=catalog.slice(0,11).map(c=>c.id);const batches=[];const callbacks=[];
 globalThis.fetch=async(_url,options)=>{const body=JSON.parse(options.body);batches.push(body.companies);return new Response(JSON.stringify({providers:body.companies.map(company=>({company,jobs:[],total:0,nextCursor:null,searchUrl:byId[company].careerUrl,error:null}))}));};
 result=await searchCareers({...DEFAULT_DISCOVERY_PROFILE,role:'software'},selected,{}, {onBatch:batch=>callbacks.push(...batch.providers)});
 assert.deepEqual(batches.map(b=>b.length),[4,4,3]);assert.equal(result.providers.length,11);assert.equal(callbacks.length,11);
 const controller=new AbortController();let completed=0;
 await assert.rejects(searchCareers({...DEFAULT_DISCOVERY_PROFILE,role:'software'},selected,{}, {signal:controller.signal,onBatch:batch=>{completed+=batch.providers.length;controller.abort();}}),e=>e.name==='AbortError');assert.equal(completed,4);
 let count=0;globalThis.fetch=async()=>{count++;if(count===1)throw new Error('Transient local service failure');return new Response(JSON.stringify({providers:selected.slice(4,8).map(company=>({company,jobs:[],error:null}))}));};
 result=await searchCareers({...DEFAULT_DISCOVERY_PROFILE,role:'software'},selected.slice(0,8),{});assert.equal(result.providers.length,8);assert.equal(result.providers.filter(p=>p.error).length,4);
 console.log('PASS old/new profiles, four-company batches, progressive results, cancellation, and batch-failure tolerance');
} finally {globalThis.fetch=original;await rm(out,{recursive:true,force:true});}
