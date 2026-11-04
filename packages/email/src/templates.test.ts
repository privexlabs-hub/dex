import { describe, expect, it } from 'vitest';
import { templates } from './index.js';

describe('email templates', () => {
  it('embed the action url', () => {
    expect(templates.verifyEmail('https://x/verify').text).toContain('https://x/verify');
    expect(templates.resetPassword('https://x/reset').subject).toMatch(/password/i);
  });
});
