import * as cheerio from 'cheerio';
import { preEvaluateJob } from './funnel';

export interface ExtractedJob {
  job_title: string;
  company_name: string;
  application_link: string;
  salary_min?: number;
  salary_max?: number;
  work_mode?: 'remote' | 'hybrid' | 'on_site';
}

/**
 * Parses the NodeFlair index page HTML to extract job details.
 */
export function parseNodeFlairIndexPage(html: string): ExtractedJob[] {
  const $ = cheerio.load(html);
  const cards = $('div[class*="jobListingCard-"]');
  const extractedJobs: ExtractedJob[] = [];

  cards.each((_, el) => {
    // 1. URL
    const relativeUrl = $(el).find('a').first().attr('href') || '';
    if (!relativeUrl) return;

    const cleanUrl = relativeUrl.startsWith('http')
      ? relativeUrl.split('?')[0]
      : `https://nodeflair.com${relativeUrl.split('?')[0]}`;

    // 2. Title
    const title = $(el).find('h2[class*="jobListingCardTitle-"]').first().text().trim();

    // 3. Company
    const company = $(el).find('p[class*="companynameAndRating-"] span').first().text().trim();

    if (title && company && cleanUrl) {
      extractedJobs.push({
        job_title: title.replace(/\s+/g, ' ').trim(),
        company_name: company.replace(/\s+/g, ' ').trim(),
        application_link: cleanUrl,
      });
    }
  });

  return extractedJobs;
}

/**
 * Standalone helper to fetch HTML using ScraperAPI if an API key is available,
 * otherwise falling back to direct request with spoofed User-Agent.
 */
async function fetchIndexHtml(url: string, scraperApiKey?: string): Promise<string> {
  const apiKey = scraperApiKey || process.env.SCRAPER_API_KEY;

  if (apiKey) {
    try {
      // For index page, let's render JS since NodeFlair relies on client rendering for hydration / Cloudflare protection
      const proxyUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.text();
      }
      console.warn(`Scraper API returned status ${res.status} ${res.statusText}, trying direct fallback...`);
    } catch (err) {
      console.warn('Scraper API failed, trying direct fallback...', err);
    }
  }

  // Fallback to direct fetch
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch index page: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

/**
 * Helper to fetch MyCareersFuture JSON REST API content.
 */
async function fetchMcfApi(url: string, scraperApiKey?: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    console.warn('Direct MyCareersFuture API fetch failed, trying ScraperAPI fallback...', err);
  }

  const apiKey = scraperApiKey || process.env.SCRAPER_API_KEY;
  if (apiKey) {
    try {
      const proxyUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.text();
      }
    } catch (err) {
      console.warn('Scraper API fallback failed for MCF:', err);
    }
  }

  throw new Error('Failed to fetch MyCareersFuture API.');
}

/**
 * Polls the NodeFlair job listing feed, runs pre-evaluation, filters out existing duplicates,
 * inserts new applications as pending, and enqueues them for background processing.
 */
export async function pollNodeFlairJobs(
  supabase: any,
  queue: any,
  scraperApiKey?: string
): Promise<number> {
  console.log('[Poller] Starting multi-source job feed polling...');

  const allJobs: ExtractedJob[] = [];

  // Source 1: NodeFlair
  const feedUrl = 'https://nodeflair.com/jobs?countries[]=Singapore&seniorities[]=junior&min_salary=5000';
  try {
    const html = await fetchIndexHtml(feedUrl, scraperApiKey);
    console.log(`[Poller] Fetched NodeFlair HTML, length: ${html.length}`);
    const nfJobs = parseNodeFlairIndexPage(html);
    console.log(`[Poller] Extracted ${nfJobs.length} jobs from NodeFlair.`);
    for (const job of nfJobs) {
      allJobs.push({
        ...job,
        work_mode: 'remote', // Legacy default for NodeFlair jobs
      });
    }
  } catch (err) {
    console.error('[Poller] Failed to poll NodeFlair index page:', err);
  }

  // Source 2: MyCareersFuture API
  try {
    const mcfSearchUrl = 'https://api.mycareersfuture.gov.sg/v2/jobs?limit=25&search=Software%20Engineer';
    console.log('[Poller] Polling MyCareersFuture API...');
    const mcfResponseText = await fetchMcfApi(mcfSearchUrl, scraperApiKey);
    const mcfData = JSON.parse(mcfResponseText);
    
    if (mcfData && Array.isArray(mcfData.results)) {
      let mcfCount = 0;
      for (const res of mcfData.results) {
        if (res.uuid && res.title && res.postedCompany?.name) {
          allJobs.push({
            job_title: res.title.replace(/\s+/g, ' ').trim(),
            company_name: res.postedCompany.name.replace(/\s+/g, ' ').trim(),
            application_link: `https://www.mycareersfuture.gov.sg/job/${res.uuid}`,
            salary_min: res.salary?.minimum ?? null,
            salary_max: res.salary?.maximum ?? null,
            work_mode: 'hybrid', // Default to hybrid per user specification
          });
          mcfCount++;
        }
      }
      console.log(`[Poller] Extracted ${mcfCount} jobs from MyCareersFuture API.`);
    }
  } catch (err) {
    console.error('[Poller] Failed to poll MyCareersFuture API:', err);
  }

  if (allJobs.length === 0) {
    console.warn('[Poller] No jobs extracted from any source. The layouts might have changed or requests were blocked.');
    return 0;
  }

  // Fetch already existing application links to deduplicate
  const linksToCheck = allJobs.map(j => j.application_link);
  const { data: existingJobs, error: dbError } = await supabase
    .from('job_applications')
    .select('application_link')
    .in('application_link', linksToCheck);

  if (dbError) {
    throw new Error(`Failed to fetch existing job applications: ${dbError.message}`);
  }

  const existingLinksSet = new Set<string>((existingJobs || []).map((j: any) => j.application_link));
  console.log(`[Poller] Found ${existingLinksSet.size} duplicate job links in database.`);

  let newJobsCount = 0;

  for (const job of allJobs) {
    // 1. Check if already exists in DB
    if (existingLinksSet.has(job.application_link)) {
      console.log(`[Poller] Skipping duplicate: ${job.job_title} at ${job.company_name}`);
      continue;
    }

    // 2. Pre-evaluation filter (with empty raw_html snippet since we only have the index listing info)
    const decision = preEvaluateJob(job.job_title, '');
    if (decision === 'drop') {
      console.log(`[Poller] Dropping job based on negative keywords: ${job.job_title} at ${job.company_name}`);
      continue;
    }

    // 3. Save to database with status 'saved'
    console.log(`[Poller] Saving new job: ${job.job_title} at ${job.company_name}`);
    const { data: insertedJob, error: insertError } = await supabase
      .from('job_applications')
      .insert({
        company_name: job.company_name,
        job_title: job.job_title,
        application_link: job.application_link,
        status: 'saved',
        work_mode: job.work_mode || 'hybrid',
        raw_html: null,
        agent_decision: decision,
        salary_min: job.salary_min || null,
        salary_max: job.salary_max || null,
      })
      .select('uuid')
      .single();

    if (insertError) {
      console.error(`[Poller] Database insert failed for ${job.job_title}:`, insertError);
      continue;
    }

    // 4. Enqueue into evaluationQueue for BullMQ processing
    try {
      await queue.add('evaluate-job', { job_application_uuid: insertedJob.uuid });
      console.log(`[Poller] Enqueued job ${insertedJob.uuid} successfully.`);
      newJobsCount++;
    } catch (queueErr) {
      console.error(`[Poller] Failed to enqueue job ${insertedJob.uuid} in BullMQ:`, queueErr);
    }
  }

  console.log(`[Poller] Completed polling run. Added ${newJobsCount} new jobs.`);
  return newJobsCount;
}
