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
