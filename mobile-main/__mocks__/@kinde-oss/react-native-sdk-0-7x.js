/**
 * Mock for @kinde-oss/react-native-sdk-0-7x
 */

module.exports = {
  KindeSDK: jest.fn(),
  useKindeAuth: jest.fn(() => ({
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    isAuthenticated: false,
    getUser: jest.fn(),
    getToken: jest.fn(),
  })),
};
