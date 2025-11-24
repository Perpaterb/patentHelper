/**
 * Web polyfill for expo-secure-store
 *
 * Uses localStorage on web as a replacement for SecureStore.
 * Note: localStorage is not as secure as SecureStore, but works for web.
 */

export async function getItemAsync(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error('Failed to get item from storage:', error);
    return null;
  }
}

export async function setItemAsync(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error('Failed to set item in storage:', error);
  }
}

export async function deleteItemAsync(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete item from storage:', error);
  }
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
};
