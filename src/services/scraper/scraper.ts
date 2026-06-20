/**
 * Scraper Service Implementation
 * Lives exclusively inside src/services/scraper
 */
import * as cheerio from 'cheerio';

export interface ScraperPayload {
  source_platform: 'linkedin' | 'nodeflair' | 'glassdoor' | 'mycareersfuture' | 'greenhouse' | 'lever' | 'other';
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
  if (lowerUrl.includes('mycareersfuture.gov.sg')) return 'mycareersfuture';
  if (lowerUrl.includes('greenhouse.io')) return 'greenhouse';
  if (lowerUrl.includes('lever.co')) return 'lever';
  return 'other';
}

/**
 * Parses LinkedIn page title tags. Tab titles are static text which
 * bypasses client-side React CSS module class name obfuscation hashes.
 */
function parseLinkedInTitle(titleText: string): { jobTitle: string; companyName: string } {
  const cleanText = titleText.replace(/\s+/g, ' ').trim();
  const parts = cleanText.split('|').map(p => p.trim()).filter(Boolean);

  let jobTitle = '';
  let companyName = '';

  if (parts.length >= 3 && parts[parts.length - 1].toLowerCase() === 'linkedin') {
    // e.g. "Software Engineer | TikTok | LinkedIn"
    jobTitle = parts[0];
    companyName = parts[1];
  } else if (parts.length === 2 && parts[1].toLowerCase() === 'linkedin') {
    // e.g. "Software Engineer at Google | LinkedIn" or "Google hiring Software Engineer... | LinkedIn"
    const content = parts[0];
    if (content.includes(' at ')) {
      const sub = content.split(' at ');
      jobTitle = sub[0].trim();
      companyName = sub[1].trim();
    } else if (content.includes(' hiring ')) {
      const sub = content.split(' hiring ');
      companyName = sub[0].trim();
      const jobAndLoc = sub[1];
      if (jobAndLoc.includes(' in ')) {
        jobTitle = jobAndLoc.split(' in ')[0].trim();
      } else {
        jobTitle = jobAndLoc.trim();
      }
    }
  } else if (parts.length >= 2) {
    jobTitle = parts[0];
    companyName = parts[1];
  }

  return { jobTitle, companyName };
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

  // Special handling for MyCareersFuture JSON REST API (since it returns JSON instead of standard HTML)
  if (platform === 'mycareersfuture') {
    let mcfData: any = null;
    try {
      mcfData = JSON.parse(rawHtml);
    } catch (e) {
      // Not direct JSON, ignore
    }

    if (!mcfData) {
      const uuidMatch = url.match(/([a-f0-9]{32})/i);
      if (uuidMatch) {
        const uuid = uuidMatch[1];
        try {
          const apiRes = await fetch(`https://api.mycareersfuture.gov.sg/v2/jobs/${uuid}`);
          if (apiRes.ok) {
            mcfData = await apiRes.json();
          }
        } catch (err) {
          console.warn('Failed to fetch MyCareersFuture job detail from API:', err);
        }
      }
    }

    if (mcfData && mcfData.title) {
      const job_title = mcfData.title.replace(/\s+/g, ' ').trim();
      let company_name = mcfData.postedCompany?.name || '';
      company_name = company_name.replace(/\s+/g, ' ').trim();
      if (!job_title || !company_name) {
        throw new Error('Contract validation failed: job_title or company_name could not be resolved from MyCareersFuture API.');
      }
      return {
        source_platform: 'mycareersfuture',
        application_link: url,
        company_name,
        job_title,
        raw_html: mcfData.description || rawHtml,
      };
    }
  }

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
        // 1. Try to extract from the document <title> tag
        const pageTitle = $('title').first().text();
        if (pageTitle) {
          const parsed = parseLinkedInTitle(pageTitle);
          if (parsed.jobTitle) job_title = parsed.jobTitle;
          if (parsed.companyName) company_name = parsed.companyName;
        }

        // 2. Fall back to DOM queries (including company links and obfuscated details)
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
            'a[href*="/company/"], ' +
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

      case 'mycareersfuture':
        if (!job_title) {
          job_title = $('#job_title').first().text().trim() || $('h1').first().text().trim();
        }
        if (!company_name) {
          company_name = $('#company_name').first().text().trim() || $('#company-info a').first().text().trim();
        }
        break;

      case 'greenhouse':
        if (!job_title) {
          job_title = $('h1.app-title, .app-title').first().text().trim();
        }
        if (!company_name) {
          company_name = $('.company-name').first().text().replace(/\bat\b/gi, '').trim();
          if (!company_name) {
            try {
              const pathParts = new URL(url).pathname.split('/').filter(Boolean);
              if (pathParts.length > 0) {
                company_name = pathParts[0];
              }
            } catch (e) {}
          }
        }
        break;

      case 'lever':
        if (!job_title) {
          job_title = $('.posting-header h2, h2').first().text().trim();
        }
        if (!company_name) {
          company_name = $('.logo img').first().attr('alt')?.replace(/logo/gi, '').trim() || '';
          if (!company_name) {
            try {
              const pathParts = new URL(url).pathname.split('/').filter(Boolean);
              if (pathParts.length > 0) {
                company_name = pathParts[0];
              }
            } catch (e) {}
          }
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

  if (company_name) {
    if (!/\s/.test(company_name) && company_name === company_name.toLowerCase()) {
      company_name = company_name.charAt(0).toUpperCase() + company_name.slice(1);
    }
  }

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
