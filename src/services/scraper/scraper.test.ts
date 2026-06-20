import { describe, it, expect } from 'vitest';
import { identifyPlatform, scrapeJobUrl } from './scraper';

describe('Scraper Service (TDD)', () => {
  describe('identifyPlatform()', () => {
    it('correctly identifies LinkedIn links', () => {
      expect(identifyPlatform('https://www.linkedin.com/jobs/view/123456')).toBe('linkedin');
      expect(identifyPlatform('https://linkedin.com/jobs/view/789')).toBe('linkedin');
    });

    it('correctly identifies Glassdoor links', () => {
      expect(identifyPlatform('https://www.glassdoor.com/job-listing/abc')).toBe('glassdoor');
    });

    it('correctly identifies NodeFlair links', () => {
      expect(identifyPlatform('https://nodeflair.com/jobs/999')).toBe('nodeflair');
    });

    it('returns other for unknown platforms', () => {
      expect(identifyPlatform('https://example.com/careers/developer')).toBe('other');
    });

    it('correctly identifies MyCareersFuture links', () => {
      expect(identifyPlatform('https://www.mycareersfuture.gov.sg/job/software-engineer-12345')).toBe('mycareersfuture');
    });

    it('correctly identifies Greenhouse links', () => {
      expect(identifyPlatform('https://boards.greenhouse.io/stripe/jobs/12345')).toBe('greenhouse');
    });

    it('correctly identifies Lever links', () => {
      expect(identifyPlatform('https://jobs.lever.co/stripe/12345')).toBe('lever');
    });
  });

  describe('scrapeJobUrl() with pre-fetched HTML', () => {
    it('correctly parses LinkedIn job titles and company names', async () => {
      const mockLinkedInHtml = `
        <html>
          <body>
            <h1 class="top-card-layout__title">Software Engineer</h1>
            <a class="topcard__org-name-link" href="#">Google</a>
          </body>
        </html>
      `;
      const result = await scrapeJobUrl('https://linkedin.com/jobs/view/1', mockLinkedInHtml);
      expect(result.job_title).toBe('Software Engineer');
      expect(result.company_name).toBe('Google');
    });

    it('correctly parses Glassdoor job titles and company names', async () => {
      const mockGlassdoorHtml = `
        <html>
          <body>
            <div data-test="job-title">Backend Developer</div>
            <div data-test="employer-name">Meta</div>
          </body>
        </html>
      `;
      const result = await scrapeJobUrl('https://glassdoor.com/job-listing/1', mockGlassdoorHtml);
      expect(result.job_title).toBe('Backend Developer');
      expect(result.company_name).toBe('Meta');
    });

    it('correctly parses NodeFlair job titles and company names', async () => {
      const mockNodeFlairHtml = `
        <html>
          <body>
            <h1 class="job-title">Fullstack Developer</h1>
            <div class="company-name">Stripe</div>
          </body>
        </html>
      `;
      const result = await scrapeJobUrl('https://nodeflair.com/jobs/1', mockNodeFlairHtml);
      expect(result.job_title).toBe('Fullstack Developer');
      expect(result.company_name).toBe('Stripe');
    });

    it('correctly parses MyCareersFuture job details from JSON API response', async () => {
      const mockMcfJsonResponse = JSON.stringify({
        title: 'Backend Software Engineer',
        postedCompany: { name: 'Government Technology Agency' },
        description: '<p>Constructed description HTML here</p>'
      });
      const result = await scrapeJobUrl(
        'https://www.mycareersfuture.gov.sg/job/software-engineer-750d032230dbbb024a1b023f03b418a0',
        mockMcfJsonResponse
      );
      expect(result.job_title).toBe('Backend Software Engineer');
      expect(result.company_name).toBe('Government Technology Agency');
      expect(result.source_platform).toBe('mycareersfuture');
    });

    it('correctly parses Greenhouse job details via JSON-LD or CSS selectors fallback', async () => {
      // 1. JSON-LD schema
      const mockGreenhouseLd = `
        <html>
          <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "JobPosting",
              "title": "Software Engineer II",
              "hiringOrganization": {
                "@type": "Organization",
                "name": "Stripe"
              }
            }
          </script>
        </html>
      `;
      const resultLd = await scrapeJobUrl('https://boards.greenhouse.io/stripe/jobs/12345', mockGreenhouseLd);
      expect(resultLd.job_title).toBe('Software Engineer II');
      expect(resultLd.company_name).toBe('Stripe');
      expect(resultLd.source_platform).toBe('greenhouse');

      // 2. CSS Selectors Fallback
      const mockGreenhouseFallback = `
        <html>
          <body>
            <h1 class="app-title">Frontend Engineer</h1>
            <span class="company-name">at Stripe</span>
          </body>
        </html>
      `;
      const resultFallback = await scrapeJobUrl('https://boards.greenhouse.io/stripe/jobs/12345', mockGreenhouseFallback);
      expect(resultFallback.job_title).toBe('Frontend Engineer');
      expect(resultFallback.company_name).toBe('Stripe');
    });

    it('correctly parses Lever job details via JSON-LD or CSS selectors fallback', async () => {
      // 1. JSON-LD schema
      const mockLeverLd = `
        <html>
          <script type="application/ld+json">
            {
              "@context": "http://schema.org",
              "@type": "JobPosting",
              "title": "Data Engineer",
              "hiringOrganization": {
                "name": "Stripe"
              }
            }
          </script>
        </html>
      `;
      const resultLd = await scrapeJobUrl('https://jobs.lever.co/stripe/12345', mockLeverLd);
      expect(resultLd.job_title).toBe('Data Engineer');
      expect(resultLd.company_name).toBe('Stripe');
      expect(resultLd.source_platform).toBe('lever');

      // 2. CSS Selectors Fallback
      const mockLeverFallback = `
        <html>
          <body>
            <div class="posting-header">
              <h2>Site Reliability Engineer</h2>
            </div>
            <div class="logo">
              <img src="/logo.png" alt="Stripe Logo" />
            </div>
          </body>
        </html>
      `;
      const resultFallback = await scrapeJobUrl('https://jobs.lever.co/stripe/12345', mockLeverFallback);
      expect(resultFallback.job_title).toBe('Site Reliability Engineer');
      expect(resultFallback.company_name).toBe('Stripe');

      // 3. Fallback to URL company name parsed from path when selector is missing
      const mockLeverFallbackUrl = `
        <html>
          <body>
            <h2>Platform Engineer</h2>
          </body>
        </html>
      `;
      const resultUrlFallback = await scrapeJobUrl('https://jobs.lever.co/netflix/12345', mockLeverFallbackUrl);
      expect(resultUrlFallback.job_title).toBe('Platform Engineer');
      expect(resultUrlFallback.company_name).toBe('Netflix');
    });

    it('correctly falls back for generic websites', async () => {
      const mockGenericHtml = `
        <html>
          <head>
            <title>Senior Frontend Dev - Netflix Careers</title>
          </head>
          <body>
            <h1>Frontend Dev</h1>
            <h2>Netflix</h2>
          </body>
        </html>
      `;
      const result = await scrapeJobUrl('https://example.com/netflix-job', mockGenericHtml);
      expect(result.job_title).toBe('Frontend Dev');
      expect(result.company_name).toBe('Netflix');
    });

    it('throws validation error if job_title or company_name are empty', async () => {
      const emptyHtml = `<html><body>Empty Page</body></html>`;
      await expect(
        scrapeJobUrl('https://example.com/job', emptyHtml)
      ).rejects.toThrow('Contract validation failed');
    });
  });
});
