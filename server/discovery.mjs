import catalog from '../shared/companies.json' with {type:'json'};
import {number,string,isoDate,plainText,safeUrl} from './careerText.mjs';
import {catalogRequest,parseCatalog,usesFullFeed} from './companyAdapters.mjs';
export {plainText} from './careerText.mjs';
const companyById = new Map(catalog.map(company => [company.id,company]));
const PAGE_SIZE = 15;
export const COMPANY_NAMES = Object.fromEntries(catalog.map(company=>[company.id,company.name]));
const ORACLE_BASE = 'https://eeho.fa.us2.oraclecloud.com';
const MICROSOFT_BASE = 'https://apply.careers.microsoft.com';
const SANOFI_BASE = 'https://jobs.sanofi.com';
export function parseOracle(payload, offset) {
  const page = payload?.items?.[0];
  if (!page || !Array.isArray(page.requisitionList)) throw new Error('Oracle search format changed. Open the career site and try again later.');
  const jobs = page.requisitionList.map(job => ({
    id: `oracle:${job.Id}`, company: 'oracle', title: plainText(job.Title),
    location: plainText(job.PrimaryLocation) || 'Location not listed',
    summary: plainText([job.ShortDescriptionStr, job.ExternalQualificationsStr, job.ExternalResponsibilitiesStr].filter(Boolean).join(' ')).slice(0, 12000),
    url: `${ORACLE_BASE}/hcmUI/CandidateExperience/en/sites/jobsearch/job/${encodeURIComponent(job.Id)}`,
    postedAt: job.PostedDate ? isoDate(job.PostedDate) : '',
    workplace: plainText(job.WorkplaceType), evidence: 'Career-site search summary',
  })).filter(job => job.title && job.id !== 'oracle:undefined');
  const total = number(page.TotalJobsCount);
  const count = page.requisitionList.length;
  return { jobs, total, nextCursor: count > 0 && offset + count < total ? offset + count : null };
}
export function parseMicrosoft(payload, offset) {
  if (!Array.isArray(payload?.data?.positions) || (payload.status && payload.status !== 200)) throw new Error('Microsoft search is unavailable or its format changed.');
  const jobs = payload.data.positions.map(job => ({
    id: `microsoft:${job.id}`, company: 'microsoft', title: plainText(job.name),
    location: Array.isArray(job.locations) ? job.locations.map(plainText).filter(Boolean).join(' · ') : 'Location not listed',
    summary: plainText(job.department),
    url: safeUrl(job.positionUrl || `/careers/job/${encodeURIComponent(job.id)}`, MICROSOFT_BASE),
    postedAt: job.postedTs ? isoDate(number(job.postedTs) * 1000) : '',
    workplace: plainText(job.workLocationOption), evidence: 'Title, department, and location only',
  })).filter(job => job.title && job.id !== 'microsoft:undefined');
  const total = number(payload.data.count);
  const count = payload.data.positions.length;
  return { jobs, total, nextCursor: count > 0 && offset + count < total ? offset + count : null };
}
export function parseSanofi(payload, offset) {
  const html = payload?.results;
  if (typeof html !== 'string' || !html.includes('id="search-results"')) throw new Error('Sanofi search is unavailable or its format changed.');
  const totalMatch = /data-total-results="(\d+)"/.exec(html);
  if (!totalMatch) throw new Error('Sanofi did not return a valid results count.');
  const jobs = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*data-job-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/gi)].map(([, href, id, content]) => ({
    id: `sanofi:${id}`, company: 'sanofi',
    title: plainText(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(content)?.[1]),
    location: plainText(/<span\b[^>]*class="job-location"[^>]*>([\s\S]*?)<\/span>/i.exec(content)?.[1]).replace(/^Location:\s*/i, '') || 'Location not listed',
    summary: plainText(/<span\b[^>]*class="job-category"[^>]*>([\s\S]*?)<\/span>/i.exec(content)?.[1]).replace(/^Category:\s*/i, ''),
    url: safeUrl(href, SANOFI_BASE), postedAt: '', workplace: '', evidence: 'Title, category, and location only',
  })).filter(job => job.title);
  const total = Number(totalMatch[1]);
  if (total > 0 && jobs.length === 0) throw new Error('Sanofi listings could not be read. Open the career site to search directly.');
  return { jobs, total, nextCursor: jobs.length > 0 && offset + jobs.length < total ? offset + jobs.length : null };
}
export function careerSearchUrl(company, query) {
  if (company === 'oracle') return `${ORACLE_BASE}/hcmUI/CandidateExperience/en/sites/jobsearch/jobs?keyword=${encodeURIComponent(query)}`;
  if (company === 'microsoft') return `${MICROSOFT_BASE}/careers?query=${encodeURIComponent(query)}`;
  if(company === 'sanofi') return `${SANOFI_BASE}/en/search-jobs/${encodeURIComponent(query)}/2649/1`;
  return companyById.get(company)?.careerUrl ?? '';
}
export function providerRequest(company, query, offset) {
  if (company === 'oracle') {
    const url = new URL(`${ORACLE_BASE}/hcmRestApi/resources/latest/recruitingCEJobRequisitions`);
    url.searchParams.set('onlyData', 'true'); url.searchParams.set('expand', 'requisitionList');
    // The finder uses commas as delimiters. Reject delimiter injection at the input boundary.
    url.searchParams.set('finder', `findReqs;siteNumber=CX_45001,keyword=${query},limit=${PAGE_SIZE},offset=${offset}`);
    return url;
  }
  if (company === 'microsoft') {
    const url = new URL(`${MICROSOFT_BASE}/api/pcsx/search`);
    for (const [key,value] of Object.entries({domain:'microsoft.com',query,start:String(offset),num:'10'})) url.searchParams.set(key,value);
    return url;
  }
  if(company !== 'sanofi') return catalogRequest(companyById.get(company),query,offset).url;
  const url = new URL(`${SANOFI_BASE}/en/search-jobs/results`);
  for (const [key,value] of Object.entries({ActiveFacetID:'0',CurrentPage:String(Math.floor(offset / PAGE_SIZE) + 1),RecordsPerPage:String(PAGE_SIZE),Keywords:query,Distance:'50',RadiusUnitType:'0',ShowRadius:'False',IsPagination:offset ? 'True' : 'False',SearchResultsModuleName:'Search Results',SearchType:'5',SortCriteria:'0',SortDirection:'0'})) url.searchParams.set(key,value);
  return url;
}
export function validateSearch(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.companies) || input.companies.length < 1 || input.companies.length > 4 || input.companies.some(c => !Object.hasOwn(COMPANY_NAMES,c))) throw new Error('Select up to four configured companies per request.');
  const query = string(input.query).trim().replace(/\s+/g,' ');
  if (!query || query.length > 100 || /[,;\r\n\x00-\x1f]/.test(query)) throw new Error('Enter a role or skill of up to 100 characters, without commas or semicolons.');
  const cursors = {};
  for (const company of input.companies) {
    const cursor = input.cursors?.[company] ?? 0;
    if (!Number.isInteger(cursor) || cursor < 0 || cursor > 10000 || cursor % (company === 'microsoft' || companyById.get(company)?.adapter === 'eightfold' ? 10 : PAGE_SIZE) !== 0) throw new Error('Invalid search page. Start a new search.');
    cursors[company] = cursor;
  }
  return { companies:[...new Set(input.companies)], query, cursors };
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function upstreamJson(url, fetcher, options = {}) {
  for (let attempt=0; attempt<3; attempt++) {
    let response;
    try {
      response = await fetcher(url, {...options, headers:{Accept:'application/json',...options.headers}, redirect:'error',signal:AbortSignal.timeout(15000)});
    } catch (error) {
      if (attempt === 2) throw new Error('Career site could not be reached. Try again later.');
      await pause(500 * 2 ** attempt); continue;
    }
    if (response.ok) return response.json();
    if (![429,500,502,503,504].includes(response.status) || attempt === 2) throw new Error(`Career site returned HTTP ${response.status}. Try again later or open the career site.`);
    const header = response.headers.get('Retry-After');
    const numeric = header === null ? NaN : Number(header);
    const retryMs = Number.isFinite(numeric) ? numeric * 1000 : header ? Date.parse(header) - Date.now() : 0;
    if (retryMs > 10000) throw new Error('Career site is rate limited. Wait before searching again.');
    await pause(Math.max(Number.isFinite(retryMs) ? retryMs : 0, 500 * 2 ** attempt));
  }
  throw new Error('Career site unavailable.');
}
export function createCareerSearch({fetcher = fetch, now = Date.now} = {}) {
  const cache = new Map(); const inFlight = new Map();
  const feedCache = new Map(); const feedInFlight = new Map();
  return async input => {
    const {companies,query,cursors} = validateSearch(input);
    const providers = await Promise.all(companies.map(async company => {
      const cursor = cursors[company]; const key = JSON.stringify([company,query.toLowerCase(),cursor]);
      const searchUrl = careerSearchUrl(company,query);
      try {
        const existing = cache.get(key);
        if (existing && now() - existing.time < 300000) return {...existing.value,cached:true};
        if (!inFlight.has(key)) {
          const work = (async () => {
            const config = companyById.get(company);
            if(config.adapter === 'direct') return {company,jobs:[],total:null,nextCursor:null,searchUrl,fetchedAt:new Date(now()).toISOString(),cached:false,error:null,mode:'direct'};
            const customParser = ({oracle:parseOracle,microsoft:parseMicrosoft,sanofi:parseSanofi})[company];
            let payload; let usedCachedFeed=false;
            if(customParser) payload = await upstreamJson(providerRequest(company,query,cursor),fetcher);
            else {
              const request = catalogRequest(config,query,cursor);
              if(usesFullFeed(config)) {
                const existingFeed = feedCache.get(company);
                if(existingFeed && now()-existingFeed.time < 300000) {payload = existingFeed.payload;usedCachedFeed=true;}
                else {
                  if(!feedInFlight.has(company)) feedInFlight.set(company,upstreamJson(request.url,fetcher,request.options).then(data=>{feedCache.set(company,{time:now(),payload:data});return data;}).finally(()=>feedInFlight.delete(company)));
                  payload = await feedInFlight.get(company);
                }
              } else payload = await upstreamJson(request.url,fetcher,request.options);
            }
            const result = customParser ? customParser(payload,cursor) : parseCatalog(config,payload,query,cursor);
            const value = {company,...result,searchUrl,fetchedAt:new Date(usesFullFeed(config)?feedCache.get(company)?.time??now():now()).toISOString(),cached:usedCachedFeed,error:null,mode:'automatic'};
            if (cache.size >= 100) cache.delete(cache.keys().next().value);
            cache.set(key,{time:now(),value}); return value;
          })();
          inFlight.set(key,work);
        }
        return await inFlight.get(key);
      } catch (error) {
        return {company,jobs:[],total:null,nextCursor:cursor,searchUrl,fetchedAt:new Date(now()).toISOString(),cached:false,error:error.message || 'Search failed. Retry this company.'};
      } finally { inFlight.delete(key); }
    }));
    return {providers};
  };
}
export function careerSearchMiddleware(search = createCareerSearch()) {
  return async (req,res,next) => {
    if (req.url?.split('?')[0] !== '/api/discover') return next();
    const reply = (status,body) => {res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
    if (req.method !== 'POST') {res.setHeader('Allow','POST');return reply(405,{error:'Use the Search careers button.'});}
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return reply(403,{error:'Cross-origin search is not allowed.'});
    if (!req.headers['content-type']?.startsWith('application/json')) return reply(415,{error:'Expected JSON.'});
    try {
      let body='';
      for await (const chunk of req) {body+=chunk;if(Buffer.byteLength(body)>4096)return reply(413,{error:'Search request is too large.'});}
      let input;
      try {input=validateSearch(JSON.parse(body));} catch(error) {return reply(400,{error:error.message});}
      return reply(200,await search(input));
    } catch {return reply(500,{error:'Search could not finish. Please try again.'});}
  };
}
export function careerSearchPlugin() {
  const middleware = careerSearchMiddleware();
  return {name:'jobbuddy-career-search',configureServer(server){server.middlewares.use(middleware);},configurePreviewServer(server){server.middlewares.use(middleware);}};
}
