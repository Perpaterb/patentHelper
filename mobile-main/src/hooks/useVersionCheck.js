/**
 * useVersionCheck Hook
 *
 * Checks the app version against the server's minimum required version.
 * Returns state indicating if an update is required.
 *
 * Usage:
 *   const { needsUpdate, isChecking, versionInfo } = useVersionCheck();
 */

import { useState, useEffect } from 'react';
import { API_BASE_URL, APP_CONFIG } from '../config/config';

/**
 * Compare two semantic version strings
 * @param {string} current - Current version (e.g., "1.0.0")
 * @param {string} minimum - Minimum required version (e.g., "1.1.0")
 * @returns {boolean} True if current version is less than minimum
 */
function isVersionLessThan(current, minimum) {
  if (!current || !minimum) return false;

  const currentParts = current.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);

  // Ensure both arrays have 3 parts
  while (currentParts.length < 3) currentParts.push(0);
  while (minimumParts.length < 3) minimumParts.push(0);

  // Compare major.minor.patch
  for (let i = 0; i < 3; i++) {
    if (currentParts[i] < minimumParts[i]) return true;
    if (currentParts[i] > minimumParts[i]) return false;
  }

  return false; // Versions are equal
}

/**
 * Hook to check if app version meets minimum requirements
 * @param {string} appType - 'mobile-main' or 'mobile-messenger'
 * @returns {Object} Version check state
 */
export function useVersionCheck(appType = 'mobile-main') {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [versionInfo, setVersionInfo] = useState({
    currentVersion: APP_CONFIG.VERSION,
    minVersion: null,
    latestVersion: null,
    updateUrl: null,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Fetch version requirements from server
      const response = await fetch(`${API_BASE_URL}/health/app-version?app=${appType}`);

      if (!response.ok) {
        throw new Error(`Version check failed: ${response.status}`);
      }

      const data = await response.json();

      const currentVersion = APP_CONFIG.VERSION;
      const minVersion = data.minVersion;
      const latestVersion = data.currentVersion;
      const updateUrl = data.updateUrl;

      // Update version info state
      setVersionInfo({
        currentVersion,
        minVersion,
        latestVersion,
        updateUrl,
      });

      // Check if update is required
      const updateRequired = isVersionLessThan(currentVersion, minVersion);
      setNeedsUpdate(updateRequired);

      if (updateRequired) {
        console.log(`[VersionCheck] Update required: ${currentVersion} < ${minVersion}`);
      } else {
        console.log(`[VersionCheck] App is up to date: ${currentVersion} >= ${minVersion}`);
      }
    } catch (err) {
      console.error('[VersionCheck] Error checking version:', err);
      setError(err.message);
      // On error, don't block the app - allow usage
      setNeedsUpdate(false);
    } finally {
      setIsChecking(false);
    }
  };

  return {
    needsUpdate,
    isChecking,
    versionInfo,
    error,
    recheckVersion: checkVersion,
  };
}

export default useVersionCheck;
