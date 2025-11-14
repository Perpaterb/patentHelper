/**
 * UserAvatar Component
 *
 * Displays user profile photo if available, otherwise falls back to text avatar.
 * Used consistently across the app for all user representations.
 *
 * Priority: Profile Photo > Member Icon > Display Name Initial > Email Initial > '?'
 *
 * Usage:
 * <UserAvatar
 *   profilePhotoUrl="http://..."
 *   memberIcon="JD"
 *   iconColor="#6200ee"
 *   displayName="John Doe"
 *   email="john@example.com"
 *   size={48}
 * />
 */

import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Avatar } from 'react-native-paper';
import { getContrastTextColor } from '../../utils/colorUtils';

/**
 * UserAvatar component
 * @param {Object} props
 * @param {string} [props.profilePhotoUrl] - URL to profile photo
 * @param {string} [props.memberIcon] - Member icon (emoji or letters)
 * @param {string} [props.iconColor='#6200ee'] - Background color for text avatar
 * @param {string} [props.displayName] - Display name (used for fallback initial)
 * @param {string} [props.email] - Email (used for fallback initial)
 * @param {number} [props.size=48] - Size of avatar
 * @param {Object} [props.style] - Additional styles
 */
const UserAvatar = ({
  profilePhotoUrl,
  memberIcon,
  iconColor = '#6200ee',
  displayName,
  email,
  size = 48,
  style,
}) => {
  // If profile photo exists, use Avatar.Image
  if (profilePhotoUrl) {
    return (
      <Avatar.Image
        size={size}
        source={{ uri: profilePhotoUrl }}
        style={[styles.avatar, style]}
      />
    );
  }

  // Otherwise use text avatar
  const label = memberIcon
    || displayName?.[0]?.toUpperCase()
    || email?.[0]?.toUpperCase()
    || '?';

  return (
    <Avatar.Text
      size={size}
      label={label}
      style={[styles.avatar, { backgroundColor: iconColor }, style]}
      color={getContrastTextColor(iconColor)}
    />
  );
};

const styles = StyleSheet.create({
  avatar: {
    // Base styles if needed
  },
});

export default UserAvatar;
