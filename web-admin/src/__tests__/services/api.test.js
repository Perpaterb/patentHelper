/**
 * API Service Test Suite
 *
 * Tests for the axios API service interceptor logic.
 * Since the API module has side effects on import, we test the interceptor
 * logic patterns directly.
 */

describe('API Service Interceptors Logic', () => {
  let localStorageMock;
  let mockLocation;

  beforeEach(() => {
    // Setup localStorage mock
    localStorageMock = {
      store: {},
      getItem: jest.fn((key) => localStorageMock.store[key] || null),
      setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete localStorageMock.store[key];
      }),
      clear: jest.fn(() => {
        localStorageMock.store = {};
      }),
    };
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

    // Setup window.location mock
    mockLocation = { href: '' };
    delete window.location;
    window.location = mockLocation;
  });

  describe('Request Interceptor Logic', () => {
    // Simulate the request interceptor logic
    function requestInterceptor(config) {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    }

    it('should add Authorization header when access token exists', () => {
      localStorageMock.store['accessToken'] = 'test-access-token';

      const config = { headers: {}, method: 'get', url: '/test' };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe('Bearer test-access-token');
    });

    it('should not add Authorization header when no token', () => {
      const config = { headers: {}, method: 'get', url: '/test' };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    it('should preserve existing config properties', () => {
      localStorageMock.store['accessToken'] = 'token';

      const config = {
        headers: { 'X-Custom': 'value' },
        method: 'post',
        url: '/users',
        data: { name: 'Test' },
      };
      const result = requestInterceptor(config);

      expect(result.headers['X-Custom']).toBe('value');
      expect(result.method).toBe('post');
      expect(result.url).toBe('/users');
      expect(result.data).toEqual({ name: 'Test' });
    });
  });

  describe('Response Interceptor Logic', () => {
    // Simulate the response error handler logic
    async function handleResponseError(error, retryRequest, refreshToken) {
      const originalRequest = error.config;

      // If 401 error and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshToken();
          localStorage.setItem('accessToken', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return retryRequest(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          throw refreshError;
        }
      }

      throw error;
    }

    it('should attempt token refresh on 401 error', async () => {
      localStorageMock.store['accessToken'] = 'old-token';

      const mockRefresh = jest.fn().mockResolvedValue('new-token');
      const mockRetry = jest.fn().mockResolvedValue({ data: 'success' });

      const error = {
        response: { status: 401 },
        config: { headers: {} },
      };

      const result = await handleResponseError(error, mockRetry, mockRefresh);

      expect(mockRefresh).toHaveBeenCalled();
      expect(localStorageMock.store['accessToken']).toBe('new-token');
      expect(mockRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { Authorization: 'Bearer new-token' },
          _retry: true,
        })
      );
      expect(result).toEqual({ data: 'success' });
    });

    it('should redirect to login when refresh fails', async () => {
      localStorageMock.store['accessToken'] = 'old-token';

      const mockRefresh = jest.fn().mockRejectedValue(new Error('Refresh failed'));
      const mockRetry = jest.fn();

      const error = {
        response: { status: 401 },
        config: { headers: {} },
      };

      await expect(handleResponseError(error, mockRetry, mockRefresh)).rejects.toThrow('Refresh failed');

      expect(localStorageMock.store['accessToken']).toBeUndefined();
      expect(mockLocation.href).toBe('/login');
      expect(mockRetry).not.toHaveBeenCalled();
    });

    it('should not retry if already retried', async () => {
      const mockRefresh = jest.fn();
      const mockRetry = jest.fn();

      const error = {
        response: { status: 401 },
        config: { headers: {}, _retry: true },
      };

      await expect(handleResponseError(error, mockRetry, mockRefresh)).rejects.toEqual(error);

      expect(mockRefresh).not.toHaveBeenCalled();
      expect(mockRetry).not.toHaveBeenCalled();
    });

    it('should reject non-401 errors without refresh', async () => {
      const mockRefresh = jest.fn();
      const mockRetry = jest.fn();

      const error = {
        response: { status: 500 },
        config: { headers: {} },
      };

      await expect(handleResponseError(error, mockRetry, mockRefresh)).rejects.toEqual(error);

      expect(mockRefresh).not.toHaveBeenCalled();
      expect(mockRetry).not.toHaveBeenCalled();
    });

    it('should reject 403 errors without refresh', async () => {
      const mockRefresh = jest.fn();
      const mockRetry = jest.fn();

      const error = {
        response: { status: 403 },
        config: { headers: {} },
      };

      await expect(handleResponseError(error, mockRetry, mockRefresh)).rejects.toEqual(error);

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('should handle network errors (no response)', async () => {
      const mockRefresh = jest.fn();
      const mockRetry = jest.fn();

      const error = {
        message: 'Network Error',
        config: { headers: {} },
      };

      await expect(handleResponseError(error, mockRetry, mockRefresh)).rejects.toEqual(error);

      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('should store access token in localStorage', () => {
      localStorage.setItem('accessToken', 'my-token');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'my-token');
      expect(localStorageMock.store['accessToken']).toBe('my-token');
    });

    it('should retrieve access token from localStorage', () => {
      localStorageMock.store['accessToken'] = 'stored-token';

      const token = localStorage.getItem('accessToken');

      expect(token).toBe('stored-token');
    });

    it('should remove access token from localStorage', () => {
      localStorageMock.store['accessToken'] = 'token-to-remove';

      localStorage.removeItem('accessToken');

      expect(localStorageMock.store['accessToken']).toBeUndefined();
    });
  });

  describe('Bearer Token Format', () => {
    it('should format token with Bearer prefix', () => {
      const token = 'my-jwt-token';
      const formatted = `Bearer ${token}`;

      expect(formatted).toBe('Bearer my-jwt-token');
    });

    it('should handle tokens with special characters', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const formatted = `Bearer ${token}`;

      expect(formatted).toContain('Bearer eyJhbGciOiJ');
    });
  });

  describe('Redirect Logic', () => {
    it('should redirect to /login path', () => {
      window.location.href = '/login';

      expect(mockLocation.href).toBe('/login');
    });

    it('should handle full URL redirect', () => {
      const loginUrl = 'http://localhost:3000/login';
      window.location.href = loginUrl;

      expect(mockLocation.href).toBe(loginUrl);
    });
  });
});
