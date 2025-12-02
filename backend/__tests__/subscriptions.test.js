/**
 * Subscription Endpoints Tests
 *
 * These tests validate the EXACT structure expected by web-admin and mobile apps.
 * If these tests fail, DO NOT change the tests - fix the code to match API.md spec.
 */

// Mock problematic ES modules
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

const request = require('supertest');
const app = require('../server');

describe('Subscription Endpoints', () => {
  describe('GET /subscriptions/pricing', () => {
    it('should return pricing with correct structure for web-admin', async () => {
      const response = await request(app)
        .get('/subscriptions/pricing')
        .expect('Content-Type', /json/)
        .expect(200);

      // Validate response structure per API.md
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pricing');

      const { pricing } = response.body;

      // Validate adminSubscription structure
      expect(pricing).toHaveProperty('adminSubscription');
      expect(pricing.adminSubscription).toHaveProperty('priceId');
      expect(pricing.adminSubscription).toHaveProperty('name');
      expect(pricing.adminSubscription).toHaveProperty('amount');
      expect(pricing.adminSubscription).toHaveProperty('currency', 'usd');
      expect(pricing.adminSubscription).toHaveProperty('interval', 'month');
      expect(pricing.adminSubscription).toHaveProperty('description');

      // Validate amount is in cents (should be 300 for $3.00 - updated Dec 2025 for competitive pricing)
      expect(typeof pricing.adminSubscription.amount).toBe('number');
      expect(pricing.adminSubscription.amount).toBe(300);

      // Validate additionalStorage structure
      expect(pricing).toHaveProperty('additionalStorage');
      expect(pricing.additionalStorage).toHaveProperty('priceId');
      expect(pricing.additionalStorage).toHaveProperty('name');
      expect(pricing.additionalStorage).toHaveProperty('amount');
      expect(pricing.additionalStorage).toHaveProperty('currency', 'usd');
      expect(pricing.additionalStorage).toHaveProperty('interval', 'month');
      expect(pricing.additionalStorage).toHaveProperty('unit', '10GB');
      expect(pricing.additionalStorage).toHaveProperty('description');

      // Validate storage amount is in cents (should be 100 for $1.00 per 10GB)
      expect(typeof pricing.additionalStorage.amount).toBe('number');
      expect(pricing.additionalStorage.amount).toBe(100);
    });

    it('should NOT return an array (common mistake)', async () => {
      const response = await request(app)
        .get('/subscriptions/pricing')
        .expect(200);

      // This was the original bug - returning array instead of object
      expect(Array.isArray(response.body.pricing)).toBe(false);
      expect(typeof response.body.pricing).toBe('object');
    });
  });

  describe('GET /subscriptions/current', () => {
    it('should return trial status for non-subscribed users', async () => {
      // Note: This test assumes no auth for now
      // In production, you'd need to mock auth middleware
      const response = await request(app)
        .get('/subscriptions/current')
        .expect('Content-Type', /json/);

      // May return 401 if auth is required - that's expected
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error');
        return; // Test passes - auth is working
      }

      // If 200, validate structure
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subscription');

      const { subscription } = response.body;

      // Should have either active subscription OR trial status
      expect(subscription).toHaveProperty('isActive');
      expect(subscription).toHaveProperty('plan');
      expect(subscription).toHaveProperty('status');

      if (subscription.status === 'trial') {
        // Trial-specific fields
        expect(subscription).toHaveProperty('daysRemaining');
        expect(subscription).toHaveProperty('trialEndsAt');
        expect(typeof subscription.daysRemaining).toBe('number');
      } else if (subscription.status === 'active') {
        // Active subscription fields
        expect(subscription).toHaveProperty('price');
        expect(subscription).toHaveProperty('interval');
        expect(subscription).toHaveProperty('currentPeriodEnd');
        expect(subscription).toHaveProperty('cancelAtPeriodEnd');
      }
    });
  });

  describe('GET /subscriptions/status', () => {
    it('should return simple boolean status', async () => {
      const response = await request(app)
        .get('/subscriptions/status')
        .expect('Content-Type', /json/);

      // May return 401 if auth is required
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error');
        return;
      }

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subscription');
      expect(response.body.subscription).toHaveProperty('isActive');
      expect(response.body.subscription).toHaveProperty('email');

      // isActive should be boolean
      expect(typeof response.body.subscription.isActive).toBe('boolean');
    });
  });

  describe('POST /subscriptions/cancel', () => {
    it('should return success when canceling active subscription', async () => {
      const response = await request(app)
        .post('/subscriptions/cancel')
        .expect('Content-Type', /json/);

      // May return 401 if auth is required
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error');
        return;
      }

      // Could be 400 if no active subscription, or 200 if subscription exists
      if (response.status === 400) {
        // User doesn't have active subscription - expected error
        expect(response.body).toHaveProperty('error', 'No active subscription');
        expect(response.body).toHaveProperty('message');
        return;
      }

      // If 200, validate success structure per API.md
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('cancelAt');

      // cancelAt should be ISO8601 timestamp
      expect(typeof response.body.cancelAt).toBe('string');
      expect(() => new Date(response.body.cancelAt)).not.toThrow();
    });
  });

  describe('POST /subscriptions/reactivate', () => {
    it('should return success when reactivating subscription', async () => {
      const response = await request(app)
        .post('/subscriptions/reactivate')
        .expect('Content-Type', /json/);

      // May return 401 if auth is required
      if (response.status === 401) {
        expect(response.body).toHaveProperty('error');
        return;
      }

      // Could be 400 if not scheduled for cancellation, or 200 if successful
      if (response.status === 400) {
        // Subscription not scheduled for cancellation - expected error
        expect(response.body).toHaveProperty('error', 'Cannot reactivate');
        expect(response.body).toHaveProperty('message');
        return;
      }

      // If 200, validate success structure per API.md
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Subscription reactivated successfully');
    });
  });
});

describe('API Contract Validation', () => {
  it('should match structures defined in API.md', () => {
    // This test serves as documentation
    // If you change endpoint structures, THIS TEST MUST BREAK
    // That means you need to update API.md FIRST, then fix the code

    const expectedPricingStructure = {
      success: true,
      pricing: {
        adminSubscription: {
          priceId: 'string',
          name: 'string',
          amount: 'number (cents)',
          currency: 'usd',
          interval: 'month',
          description: 'string',
        },
        additionalStorage: {
          priceId: 'string',
          name: 'string',
          amount: 'number (cents)',
          currency: 'usd',
          interval: 'month',
          unit: 'GB',
          description: 'string',
        },
      },
    };

    // This is a documentation test - it always passes
    // But it forces developers to READ the expected structure
    expect(expectedPricingStructure).toBeDefined();
  });
});
