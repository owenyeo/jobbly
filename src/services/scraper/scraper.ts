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


  // Try extracting from standard JSON-LD schema (Google JobPosting schema format)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;
      const json = JSON.parse(content);
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        if (item['@context']?.includes('schema.org') && (item['@type'] === 'JobPosting' || item['type'] === 'JobPosting')) {
          if (item.title && !job_title) {
            job_title = item.title;
          }
          const orgName = item.hiringOrganization?.name || item.hiringOrganization;
          if (typeof orgName === 'string' && !company_name) {
            company_name = orgName;
          }
        }
      }
    } catch (e) {
      // Ignore invalid JSON-LD formats
    }
  });

  // If fields are still empty, use CSS selector queries based on platform
  if (!job_title || !company_name) {
    switch (platform) {
      case 'linkedin':
        if (!job_title) {
          job_title = $(
            '.job-details-jobs-unified-top-card__job-title, ' +
            '.jobs-unified-top-card__job-title, ' +
            '.top-card-layout__title, ' +
            '.topcard__title, ' +
            '.jobs-unified-top-card h1, ' +
            '.job-details-jobs-unified-top-card h1, ' +
            '.jobs-details h1'
          ).first().text().trim();
        }
        if (!company_name) {
          company_name = $(
            '.job-details-jobs-unified-top-card__company-name, ' +
            '.jobs-unified-top-card__company-name, ' +
            '.jobs-details-top-card__company-name, ' +
            'a.topcard__org-name-link, ' +
            '.topcard__org-name, ' +
            '.jobs-unified-top-card__primary-description-container a, ' +
            '[data-tracking-control-name="public_jobs_topcard-org-name"]'
          ).first().text().trim();
        }
        break;

      case 'glassdoor':
        if (!job_title) {
          job_title = $('[data-test="job-title"], .JobDetails_jobTitle').first().text().trim();
        }
        if (!company_name) {
          company_name = $('[data-test="employer-name"], .JobDetails_companyName').first().text().trim();
        }
        break;

      case 'nodeflair':
        if (!job_title) {
          job_title = $('h1.job-title, .job-title, h1').first().text().trim();
        }
        if (!company_name) {
          company_name = $('.company-name, a.company-name').first().text().trim();
        }
        break;

      case 'other':
      default:
        break;
    }
  }

  // Final fallbacks for missing values (generic selectors)
  if (!job_title) {
    job_title = $('h1').first().text().trim();
  }
  if (!company_name) {
    company_name = $('h2').first().text().trim();

    // If company name is still blank, extract from HTML <title> tag
    if (!company_name) {
      const titleText = $('title').text();
      if (titleText.includes('-')) {
        company_name = titleText.split('-').pop()?.trim() || '';
      } else if (titleText.includes('|')) {
        company_name = titleText.split('|').pop()?.trim() || '';
      }
    }
  }

  // Clean up any remaining whitespace noise
  job_title = job_title.replace(/\s+/g, ' ').trim();
  company_name = company_name.replace(/\s+/g, ' ').trim();

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
