// Unit tests for the ESPN news payload normaliser — pure Node, no browser.
// The live news endpoint can't be hit from CI, so this locks the mapping the
// News tabs rely on.
import { test, expect } from '@playwright/test';
import { normaliseNews } from '../src/lib/data/adapter.js';

test('maps ESPN articles to the dialogs’ article shape', () => {
  const payload = {
    articles: [
      {
        dataSourceIdentifier: 'abc123',
        headline: 'Mexico cruise past Iraq',
        description: 'Giménez double sets the hosts on their way.',
        published: '2026-06-18T21:00:00Z',
        byline: 'ESPN staff',
        links: { web: { href: 'https://espn.com/story/1' } },
        images: [{ url: 'https://espn.com/img/1.jpg' }],
      },
    ],
  };
  expect(normaliseNews(payload)).toEqual([
    {
      id: 'abc123',
      headline: 'Mexico cruise past Iraq',
      description: 'Giménez double sets the hosts on their way.',
      published: '2026-06-18T21:00:00Z',
      byline: 'ESPN staff',
      url: 'https://espn.com/story/1',
      image: 'https://espn.com/img/1.jpg',
    },
  ]);
});

test('falls back to the mobile link and drops articles without headline or url', () => {
  const payload = {
    articles: [
      { headline: 'Mobile only', links: { mobile: { href: 'https://m.espn.com/story/2' } } },
      { headline: 'No link at all', links: {} },
      { description: 'No headline', links: { web: { href: 'https://espn.com/story/3' } } },
    ],
  };
  const out = normaliseNews(payload);
  expect(out).toHaveLength(1);
  expect(out[0].url).toBe('https://m.espn.com/story/2');
});

test('tolerates empty and malformed payloads', () => {
  expect(normaliseNews(null)).toEqual([]);
  expect(normaliseNews({})).toEqual([]);
  expect(normaliseNews({ articles: [{}] })).toEqual([]);
});
