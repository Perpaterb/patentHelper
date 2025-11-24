/**
 * Web polyfill for expo-secure-store
 *
 * Uses localStorage on web since SecureStore is not available.
 * This allows mobile-main code to work unchanged on web.
 */

export async function getItemAsync(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('SecureStore.getItemAsync failed:', error);
    return null;
  }
}

export async function setItemAsync(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn('SecureStore.setItemAsync failed:', error);
  }
}

export async function deleteItemAsync(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('SecureStore.deleteItemAsync failed:', error);
  }
}

export function isAvailableAsync() {
  return Promise.resolve(true);
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  isAvailableAsync,
};
