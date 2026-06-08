import * as cheerio from 'cheerio';
import { EvaluationState } from '../state';
import { supabase } from '../supabaseClient';

export async function extractNode(state: EvaluationState): Promise<Partial<EvaluationState>> {
  const errors: string[] = [];
  let rawHtml = state.raw_html;
  let jobTitle = state.job_title;
  let companyName = state.company_name;

  try {
    // If raw_html is missing from input state, fetch from Supabase
    if (!rawHtml && state.job_application_uuid) {
      const { data, error } = await supabase
        .from('job_applications')
        .select('raw_html, job_title, company_name')
        .eq('uuid', state.job_application_uuid)
        .single();

      if (error) {
        throw new Error(`Failed to fetch raw HTML from database: ${error.message}`);
      }
      if (data) {
        rawHtml = data.raw_html;
        jobTitle = data.job_title || jobTitle;
        companyName = data.company_name || companyName;
      }
    }

    if (!rawHtml) {
      throw new Error('No raw HTML found for extraction.');
    }

    // Clean HTML content using Cheerio
    const $ = cheerio.load(rawHtml);
    $('script, style, head, nav, footer, iframe, noscript').remove();
    const cleanedText = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000); // Truncate to prevent token limit issues

    let structuredDescription = '';

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (apiKey && apiKey !== 'test-key' && !apiKey.startsWith('mock')) {
      // Real API call to DeepSeek
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant that extracts structured job details from raw scraped text. Provide a summary in clean markdown focusing on: 1. Role Description, 2. Required Technical Stack, 3. Candidate Experience / Requirements.',
            },
            {
              role: 'user',
              content: `Job Title: ${jobTitle}\nCompany: ${companyName}\n\nScraped Job Posting Text:\n${cleanedText}`,
            },
          ],
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API request failed: ${response.statusText}`);
      }

      const resBody = await response.json();
      structuredDescription = resBody.choices?.[0]?.message?.content || '';
    } else {
      // Mock Fallback for local development/tests
      structuredDescription = `[Mock Cleaned Profile]
### Role & Requirements
* **Role**: Systems Engineer or Developer role at ${companyName} working on ${jobTitle}.
* **Tech Stack**: TypeScript, Next.js, Node.js, PostgreSQL, PySpark, LangGraph.
* **Requirements**: Strong systems design, event-driven message architectures, and database scaling experience.`;
    }

    return {
      raw_html: rawHtml,
      job_title: jobTitle,
      company_name: companyName,
      structured_description: structuredDescription,
    };
  } catch (error: any) {
    console.error('Error in extract node:', error);
    return {
      errors: [error.message || 'Error occurred in extract node'],
    };
  }
}
