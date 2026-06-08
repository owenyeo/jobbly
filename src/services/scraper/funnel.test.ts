import { describe, it, expect } from 'vitest';
import { preEvaluateJob, FunnelResult } from './funnel';

describe('Pre-Evaluation Funnel (Workflow A.5)', () => {
  describe('Negative Filter (Exclusion - Fail Fast)', () => {
    it('drops jobs with seniority markers beyond fresh graduate scope', () => {
      const cases = [
        'Senior Software Engineer',
        'Staff Developer',
        'Principal Engineer',
        'Director of Engineering',
        'VP of Technology',
        'Lead React Developer',
        'Head of Product',
      ];

      cases.forEach((title) => {
        const result = preEvaluateJob(title, 'We use React and Node.js');
        expect(result).toBe('drop');
      });
    });

    it('drops jobs in disconnected departments', () => {
      const cases = [
        'Sales Representative',
        'Marketing Manager',
        'HR Specialist',
        'Senior Accountant', // matches both department and seniority
        'Staff Nurse',
      ];

      cases.forEach((title) => {
        const result = preEvaluateJob(title, 'Looking for sales and marketing expertise');
        expect(result).toBe('drop');
      });
    });

    it('performs negative filtering case-insensitively', () => {
      const result1 = preEvaluateJob('SENIOR DEVELOPER', 'React');
      const result2 = preEvaluateJob('nurse manager', 'React');
      expect(result1).toBe('drop');
      expect(result2).toBe('drop');
    });
  });

  describe('Broad Tech Taxonomy (Inclusion - Pass to LLM)', () => {
    it('passes to LLM if title matches core competency', () => {
      const result = preEvaluateJob('Junior React Developer', 'Standard HTML');
      expect(result).toBe('pass');
    });

    it('passes to LLM if raw HTML contains competency in first 1000 characters', () => {
      const rawHtml = '<div>' + 'A'.repeat(500) + 'react' + 'B'.repeat(400) + '</div>';
      const result = preEvaluateJob('Junior Associate', rawHtml);
      expect(result).toBe('pass');
    });

    it('falls back if competency is only found after first 1000 characters of raw HTML', () => {
      // Competency word 'react' starts at index 1005 (beyond 1000-character limit)
      const rawHtml = '<div>' + 'A'.repeat(1000) + 'react' + '</div>';
      const result = preEvaluateJob('Junior Associate', rawHtml);
      expect(result).toBe('fallback');
    });

    it('performs tech taxonomy checks case-insensitively', () => {
      const result1 = preEvaluateJob('LANGGRAPH developer', '');
      const result2 = preEvaluateJob('Intern', 'We love REACT');
      expect(result1).toBe('pass');
      expect(result2).toBe('pass');
    });
  });

  describe('Fallback Logic', () => {
    it('returns fallback if job passes negative filter but fails tech taxonomy', () => {
      const title = 'Product Designer';
      const rawHtml = 'We use Figma, Sketch, and Adobe XD for UI design.';
      const result = preEvaluateJob(title, rawHtml);
      expect(result).toBe('fallback');
    });
  });
});
