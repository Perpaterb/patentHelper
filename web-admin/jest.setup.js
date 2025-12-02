/**
 * Jest Setup File
 *
 * Configures the testing environment for web-admin React Native (Expo) app.
 */

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @kinde-oss/kinde-auth-react
jest.mock('@kinde-oss/kinde-auth-react', () => ({
  useKindeAuth: jest.fn(() => ({
    login: jest.fn(),
    logout: jest.fn(),
    isAuthenticated: false,
    isLoading: false,
    user: null,
    getToken: jest.fn(() => Promise.resolve('mock-token')),
  })),
  KindeProvider: ({ children }) => children,
}));

// Mock react-native-paper Portal
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  return {
    ...RealModule,
    Portal: ({ children }) => children,
  };
});

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0]?.includes?.('Animated') ||
    args[0]?.includes?.('useNativeDriver') ||
    args[0]?.includes?.('shadow*') ||
    args[0]?.includes?.('pointerEvents') ||
    args[0]?.includes?.('deprecated')
  ) {
    return;
  }
  originalWarn(...args);
};

// Suppress console errors for known issues during tests
const originalError = console.error;
console.error = (...args) => {
  if (
    args[0]?.includes?.('react-test-renderer is deprecated')
  ) {
    return;
  }
  originalError(...args);
};
