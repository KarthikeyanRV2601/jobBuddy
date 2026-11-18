import companyData from '../../shared/companies.json';
export type CompanyCategory = 'product' | 'startup';
export type CompanyDefinition = {
  readonly id: string;
  readonly name: string;
  readonly category: CompanyCategory;
  readonly careerUrl: string;
  readonly adapter: string;
  readonly salaryUrl: string | null;
  readonly researchUrl: string;
  readonly researchBasis: string;
  readonly checkedAt: string;
};
export const COMPANY_CATALOG = companyData as readonly CompanyDefinition[];
export type CareerCompany = string;
export const CAREER_COMPANIES: readonly CareerCompany[] = COMPANY_CATALOG.map(company=>company.id);
export const COMPANY_LABELS: Readonly<Record<CareerCompany,string>> = Object.fromEntries(COMPANY_CATALOG.map(company=>[company.id,company.name]));
export const COMPANY_BY_ID: Readonly<Record<CareerCompany,CompanyDefinition>> = Object.fromEntries(COMPANY_CATALOG.map(company=>[company.id,company]));
export type DiscoveryProfile = {
  readonly role: string;
  readonly skills: string;
  readonly location: string;
  readonly experience: string;
  readonly remote: boolean;
  readonly companies: readonly CareerCompany[];
};
export type CareerJob = {
  readonly id: string;
  readonly company: CareerCompany;
  readonly title: string;
  readonly location: string;
  readonly summary: string;
  readonly url: string;
  readonly postedAt: string;
  readonly workplace: string;
  readonly evidence: string;
};
export type CareerProviderResult = {
  readonly company: CareerCompany;
  readonly jobs: readonly CareerJob[];
  readonly total: number | null;
  readonly nextCursor: number | null;
  readonly searchUrl: string;
  readonly fetchedAt: string;
  readonly cached: boolean;
  readonly error: string | null;
  readonly mode?: 'automatic' | 'direct';
};
export type DiscoveryResponse = { readonly providers: readonly CareerProviderResult[] };
