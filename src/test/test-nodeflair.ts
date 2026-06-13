import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

async function testNodeFlair() {
  const apiKey = 'd97bf9500cb3ec29686ca1d7a9e627e4';
  const url = 'https://nodeflair.com/jobs?countries[]=Singapore&seniorities[]=junior&min_salary=5000';
  const proxyUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true`;

  console.log('Fetching NodeFlair with filters via ScraperAPI...');
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    console.error('Failed to fetch:', res.statusText);
    return;
  }

  const html = await res.text();
  console.log('HTML length:', html.length);

  const $ = cheerio.load(html);
  
  // Find all links to see their format
  const links: string[] = [];
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      links.push(href);
    }
  });

  // Let's debug the cheerio selection for jobListingCard
  const cards = $('div[class*="jobListingCard-"]');
  console.log(`\nFound ${cards.length} elements matching div[class*="jobListingCard-"]`);

  // Parse the cards using the verified DOM structure
  console.log('\n--- EXTRACTING JOB CARDS ---');
  const extractedJobs: any[] = [];

  cards.each((i, el) => {
    // 1. URL
    const relativeUrl = $(el).find('a').first().attr('href') || '';
    const cleanUrl = relativeUrl.startsWith('http') ? relativeUrl.split('?')[0] : `https://nodeflair.com${relativeUrl.split('?')[0]}`;

    // 2. Title
    const title = $(el).find('h2[class*="jobListingCardTitle-"]').first().text().trim();

    // 3. Company
    const company = $(el).find('p[class*="companynameAndRating-"] span').first().text().trim();

    if (title && company && cleanUrl) {
      extractedJobs.push({ title, company, url: cleanUrl });
    }
  });

  console.log(`Successfully extracted ${extractedJobs.length} jobs!`);
  console.log('Sample of extracted jobs:', extractedJobs.slice(0, 10));
}

testNodeFlair().catch(console.error);
