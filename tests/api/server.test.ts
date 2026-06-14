// @vitest-environment node
import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';

// Must be hoisted before server import so they are in place at module-load time
vi.mock('vite', () => ({
  createServer: vi.fn().mockResolvedValue({
    middlewares: { use: vi.fn() },
    close: vi.fn(),
  }),
}));

vi.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: () => (_req: any, _res: any, next: () => void) => next(),
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
  cert: vi.fn(),
  getApps: vi.fn().mockReturnValue([]),
  getApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({}),
  FieldValue: { serverTimestamp: vi.fn() },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: vi.fn() },
  })),
  Type: {
    OBJECT: 'object',
    ARRAY: 'array',
    STRING: 'string',
  },
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  })),
}));

process.env.NODE_ENV = 'test';

import request from 'supertest';
import { app } from '../../server';

describe('GET /api/ai/status', () => {
  it('returns 200 with available=false when no API key set', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).get('/api/ai/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('available');
    expect(res.body.available).toBe(false);
  });
});

describe('GET /api/stripe/status', () => {
  it('returns 200 with available=false when no Stripe key set', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await request(app).get('/api/stripe/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('available');
    expect(res.body.available).toBe(false);
    expect(res.body).toHaveProperty('priceId');
  });
});

describe('POST /api/generate-story', () => {
  it('returns 400 when theme is missing', async () => {
    const res = await request(app).post('/api/generate-story').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns fallback story when no AI key is configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app)
      .post('/api/generate-story')
      .send({ theme: 'dragons', kidName: 'Alex', kidAge: 6 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fallback).toBe(true);
    expect(Array.isArray(res.body.pages)).toBe(true);
    expect(res.body.pages.length).toBeGreaterThan(0);
  });
});

describe('POST /api/stripe/create-checkout-session', () => {
  it('returns 400 when uid or email is missing', async () => {
    const res = await request(app)
      .post('/api/stripe/create-checkout-session')
      .send({ uid: 'user-123' });
    expect(res.status).toBe(400);
  });

  it('returns sandbox checkout URL when Stripe is not configured', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const res = await request(app)
      .post('/api/stripe/create-checkout-session')
      .send({ uid: 'user-123', email: 'test@example.com', returnUrl: 'http://localhost' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sandbox', true);
    expect(res.body.url).toContain('checkout-sandbox');
  });
});
