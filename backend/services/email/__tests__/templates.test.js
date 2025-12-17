/**
 * Email Templates Unit Tests
 *
 * Tests for email template rendering (HTML and plain text)
 */

const { welcome, trial_reminder, log_export } = require('../templates');

describe('Email Templates', () => {
  describe('Welcome Template', () => {
    test('should generate welcome email with all required fields', () => {
      const data = {
        userName: 'John Doe',
        loginUrl: 'http://localhost:3000/login',
      };

      const result = welcome(data);

      expect(result).toBeDefined();
      expect(result.subject).toBe('Welcome to Family Helper!');
      expect(result.text).toBeDefined();
      expect(result.html).toBeDefined();
    });

    test('welcome email should include user name in text', () => {
      const data = {
        userName: 'Jane Smith',
        loginUrl: 'http://localhost:3000/login',
      };

      const result = welcome(data);

      expect(result.text).toContain('Jane Smith');
      expect(result.html).toContain('Jane Smith');
    });

    test('welcome email should include login URL', () => {
      const data = {
        userName: 'John Doe',
        loginUrl: 'http://localhost:3000/login',
      };

      const result = welcome(data);

      expect(result.text).toContain('http://localhost:3000/login');
      expect(result.html).toContain('http://localhost:3000/login');
    });

    test('welcome email should mention 20-day trial', () => {
      const data = {
        userName: 'John Doe',
        loginUrl: 'http://localhost:3000/login',
      };

      const result = welcome(data);

      expect(result.text).toContain('20-day free trial');
      expect(result.html).toContain('20-day free trial');
    });
  });

  describe('Trial Reminder Template', () => {
    test('should generate trial reminder email with all required fields', () => {
      const data = {
        userName: 'John Doe',
        daysLeft: 5,
        subscribeUrl: 'http://familyhelperapp.com/subscribe',
      };

      const result = trial_reminder(data);

      expect(result).toBeDefined();
      expect(result.subject).toContain('5 days');
      expect(result.subject).toContain('trial expires');
      expect(result.text).toBeDefined();
      expect(result.html).toBeDefined();
    });

    test('trial reminder should include days left in subject', () => {
      const data = {
        userName: 'John Doe',
        daysLeft: 3,
        subscribeUrl: 'http://familyhelperapp.com/subscribe',
      };

      const result = trial_reminder(data);

      expect(result.subject).toContain('3 days');
    });

    test('trial reminder should include user name in text', () => {
      const data = {
        userName: 'Jane Smith',
        daysLeft: 5,
        subscribeUrl: 'http://familyhelperapp.com/subscribe',
      };

      const result = trial_reminder(data);

      expect(result.text).toContain('Jane Smith');
      expect(result.html).toContain('Jane Smith');
    });

    test('trial reminder should include subscribe URL', () => {
      const data = {
        userName: 'John Doe',
        daysLeft: 5,
        subscribeUrl: 'http://familyhelperapp.com/subscribe',
      };

      const result = trial_reminder(data);

      expect(result.text).toContain('http://familyhelperapp.com/subscribe');
      expect(result.html).toContain('http://familyhelperapp.com/subscribe');
    });

    test('trial reminder should handle 1 day left correctly', () => {
      const data = {
        userName: 'John Doe',
        daysLeft: 1,
        subscribeUrl: 'http://familyhelperapp.com/subscribe',
      };

      const result = trial_reminder(data);

      expect(result.subject).toContain('1 day');
      expect(result.text).toContain('1 day');
    });
  });

  describe('Log Export Template', () => {
    test('should generate log export email with all required fields', () => {
      const data = {
        userName: 'John Doe',
        groupName: 'Smith Family',
        downloadUrl: 'https://example.com/downloads/abc123',
        password: 'SecurePass123',
        expiresIn: '7 days',
      };

      const result = log_export(data);

      expect(result).toBeDefined();
      expect(result.subject).toContain('audit log export is ready');
      expect(result.subject).toContain('Smith Family');
      expect(result.text).toBeDefined();
      expect(result.html).toBeDefined();
    });

    test('log export email should include user name', () => {
      const data = {
        userName: 'Jane Smith',
        groupName: 'Smith Family',
        downloadUrl: 'https://example.com/downloads/abc123',
        password: 'SecurePass123',
        expiresIn: '7 days',
      };

      const result = log_export(data);

      expect(result.text).toContain('Jane Smith');
      expect(result.html).toContain('Jane Smith');
    });

    test('log export email should include group name', () => {
      const data = {
        userName: 'John Doe',
        groupName: 'Johnson Family',
        downloadUrl: 'https://example.com/downloads/abc123',
        password: 'SecurePass123',
        expiresIn: '7 days',
      };

      const result = log_export(data);

      expect(result.text).toContain('Johnson Family');
      expect(result.html).toContain('Johnson Family');
    });

    test('log export email should include download URL', () => {
      const data = {
        userName: 'John Doe',
        groupName: 'Smith Family',
        downloadUrl: 'https://example.com/downloads/abc123',
        password: 'SecurePass123',
        expiresIn: '7 days',
      };

      const result = log_export(data);

      expect(result.text).toContain('https://example.com/downloads/abc123');
      expect(result.html).toContain('https://example.com/downloads/abc123');
    });

    test('log export email should include password', () => {
      const data = {
        userName: 'John Doe',
        groupName: 'Smith Family',
        downloadUrl: 'https://example.com/downloads/abc123',
        password: 'MySecretPass456',
        expiresIn: '7 days',
      };

      const result = log_export(data);

      expect(result.text).toContain('MySecretPass456');
      expect(result.html).toContain('MySecretPass456');
    });

    test('log export email should include expiration time', () => {
      const data = {
        userName: 'John Doe',
        groupName: 'Smith Family',
        downloadUrl: 'https://example.com/downloads/abc123',
        password: 'SecurePass123',
        expiresIn: '14 days',
      };

      const result = log_export(data);

      expect(result.text).toContain('14 days');
      expect(result.html).toContain('14 days');
    });

    test('log export email should warn about password protection', () => {
      const data = {
        userName: 'John Doe',
        groupName: 'Smith Family',
        downloadUrl: 'https://example.com/downloads/abc123',
        password: 'SecurePass123',
        expiresIn: '7 days',
      };

      const result = log_export(data);

      expect(result.text.toLowerCase()).toContain('password');
      expect(result.html.toLowerCase()).toContain('password');
    });
  });

  describe('Template Structure', () => {
    test('all templates should return object with subject, text, and html', () => {
      const welcomeResult = welcome({
        userName: 'Test User',
        loginUrl: 'http://localhost:3000',
      });

      const trialResult = trial_reminder({
        userName: 'Test User',
        daysLeft: 5,
        subscribeUrl: 'http://localhost:3000',
      });

      const logResult = log_export({
        userName: 'Test User',
        groupName: 'Test Family',
        downloadUrl: 'http://localhost:3000',
        password: 'test123',
        expiresIn: '7 days',
      });

      [welcomeResult, trialResult, logResult].forEach(result => {
        expect(result).toHaveProperty('subject');
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('html');
        expect(typeof result.subject).toBe('string');
        expect(typeof result.text).toBe('string');
        expect(typeof result.html).toBe('string');
      });
    });

    test('HTML templates should contain basic HTML structure', () => {
      const result = welcome({
        userName: 'Test User',
        loginUrl: 'http://localhost:3000',
      });

      expect(result.html).toContain('<div');
      expect(result.html).toContain('</div>');
      expect(result.html).toContain('<h1');
      expect(result.html).toContain('</h1>');
    });

    test('text templates should be plain text (no HTML tags)', () => {
      const result = welcome({
        userName: 'Test User',
        loginUrl: 'http://localhost:3000',
      });

      expect(result.text).not.toContain('<div');
      expect(result.text).not.toContain('<h1');
      expect(result.text).not.toContain('<p');
    });
  });
});
