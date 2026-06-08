/**
 * Scraper Service Implementation
 * Lives exclusively inside src/services/scraper
 */
import * as cheerio from 'cheerio';

export interface ScraperPayload {
  source_platform: 'linkedin' | 'nodeflair' | 'glassdoor' | 'other';
  application_link: string;
  company_name: string;
  job_title: string;
  raw_html: string;
}

/**
 * Normalizes and determines which platform the job URL belongs to.
 */
export function identifyPlatform(url: string): ScraperPayload['source_platform'] {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('linkedin.com')) return 'linkedin';
  if (lowerUrl.includes('nodeflair.com')) return 'nodeflair';
  if (lowerUrl.includes('glassdoor.com')) return 'glassdoor';
  return 'other';
}

/**
 * Helper to fetch HTML. Uses ScraperAPI if an API key is available,
 * otherwise falls back to a direct fetch with spoofed User-Agent.
 */
async function fetchHtml(url: string): Promise<string> {
  const apiKey = process.env.SCRAPER_API_KEY;

  if (apiKey) {
    try {
      const proxyUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.text();
      }
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
  return await res.text();
}

/**
 * Core scraping function.
 * Parses raw HTML using cheerio based on platform DOM heuristics.
 */
export async function scrapeJobUrl(url: string, preFetchedHtml?: string): Promise<ScraperPayload> {
  const platform = identifyPlatform(url);

  // PHASE 1: Retrieve Raw HTML
  const rawHtml = preFetchedHtml || (await fetchHtml(url));

  // PHASE 2: Load DOM & Extract Metadata using Cheerio
  const $ = cheerio.load(rawHtml);
  let job_title = '';
  let company_name = '';

  switch (platform) {
    case 'linkedin':
      job_title = $('.top-card-layout__title, .topcard__title, h1').first().text().trim();
      company_name = $('a.topcard__org-name-link, .topcard__org-name, [data-tracking-control-name="public_jobs_topcard-org-name"]').first().text().trim();
      break;

    case 'glassdoor':
      job_title = $('[data-test="job-title"], .JobDetails_jobTitle').first().text().trim();
      company_name = $('[data-test="employer-name"], .JobDetails_companyName').first().text().trim();
      break;

    case 'nodeflair':
      job_title = $('h1.job-title, .job-title, h1').first().text().trim();
      company_name = $('.company-name, a.company-name').first().text().trim();
      break;

    case 'other':
    default:
      // Heuristic fallback for general job listings
      job_title = $('h1').first().text().trim();
      company_name = $('h2').first().text().trim();

      // If company name is still blank, try extracting it from document title tags
      if (!company_name) {
        const titleText = $('title').text();
        if (titleText.includes('-')) {
          // e.g. "Software Engineer - Google Careers"
          company_name = titleText.split('-').pop()?.trim() || '';
        }
      }
      break;
  }

  // Clean up any remaining whitespace noise
  job_title = job_title.replace(/\s+/g, ' ');
  company_name = company_name.replace(/\s+/g, ' ');

  // PHASE 3: Contract Validation
  if (!job_title || !company_name) {
    throw new Error('Contract validation failed: job_title or company_name could not be resolved.');
  }

  return {
    source_platform: platform,
    application_link: url,
    company_name,
    job_title,
    raw_html: rawHtml,
  };
}
