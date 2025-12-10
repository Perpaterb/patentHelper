/**
 * Users Controller
 *
 * Handles user profile updates.
 *
 * @module controllers/users
 */

const { prisma } = require('../config/database');

/**
 * Get user profile
 * GET /users/profile
 *
 * Returns the authenticated user's profile information
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function getProfile(req, res) {
  try {
    console.log('[users.controller] getProfile called');
    console.log('[users.controller] req.user:', req.user);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
      select: {
        userId: true,
        email: true,
        displayName: true,
        memberIcon: true,
        iconColor: true,
        profilePhotoFileId: true,
        isSubscribed: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
      });
    }

    console.log('[users.controller] User profile retrieved:', user);

    // Construct profile photo URL if photo exists
    const userResponse = {
      ...user,
      profilePhotoUrl: user.profilePhotoFileId
        ? `${process.env.API_BASE_URL || 'http://localhost:3000'}/files/${user.profilePhotoFileId}`
        : null
    };

    res.status(200).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message,
    });
  }
}

/**
 * Update user profile (display name and member icon)
 * PUT /users/profile
 *
 * Updates the user's display name and member icon
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} req.body - Request body
 * @param {string} [req.body.displayName] - User's display name
 * @param {string} [req.body.memberIcon] - User's member icon (emoji or letters, max 2 chars)
 * @param {Object} res - Express response
 */
async function updateProfile(req, res) {
  try {
    console.log('[users.controller] updateProfile called');
    console.log('[users.controller] req.body:', req.body);
    console.log('[users.controller] req.user:', req.user);

    const { displayName, memberIcon, iconColor, profilePhotoFileId } = req.body;

    // Validate inputs
    if (displayName !== undefined && typeof displayName !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'displayName must be a string',
      });
    }

    if (memberIcon !== undefined) {
      if (typeof memberIcon !== 'string') {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'memberIcon must be a string',
        });
      }

      if (memberIcon.length > 10) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'memberIcon must be 10 characters or less',
        });
      }
    }

    if (iconColor !== undefined) {
      if (typeof iconColor !== 'string') {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'iconColor must be a string',
        });
      }

      // Validate hex color format (#RRGGBB)
      if (!/^#[0-9A-Fa-f]{6}$/.test(iconColor)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'iconColor must be a valid hex color (e.g., #FF5733)',
        });
      }
    }

    if (profilePhotoFileId !== undefined) {
      // Allow null to remove photo
      if (profilePhotoFileId !== null && typeof profilePhotoFileId !== 'string') {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'profilePhotoFileId must be a string or null',
        });
      }
    }

    // Build update data object (only include fields that were provided)
    const updateData = {};
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (memberIcon !== undefined) {
      updateData.memberIcon = memberIcon;
    }
    if (iconColor !== undefined) {
      updateData.iconColor = iconColor;
    }
    if (profilePhotoFileId !== undefined) {
      updateData.profilePhotoFileId = profilePhotoFileId;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No data provided',
        message: 'Please provide displayName or memberIcon to update',
      });
    }

    // Update user in database
    console.log('[users.controller] Updating user with userId:', req.user.userId);
    console.log('[users.controller] Update data:', updateData);

    const updatedUser = await prisma.user.update({
      where: { userId: req.user.userId },
      data: updateData,
      select: {
        userId: true,
        email: true,
        displayName: true,
        memberIcon: true,
        iconColor: true,
        profilePhotoFileId: true,
      },
    });

    console.log('[users.controller] User updated successfully:', updatedUser);

    // Construct profile photo URL if photo exists
    const userResponse = {
      ...updatedUser,
      profilePhotoUrl: updatedUser.profilePhotoFileId
        ? `${process.env.API_BASE_URL || 'http://localhost:3000'}/files/${updatedUser.profilePhotoFileId}`
        : null
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse,
    });
  } catch (error) {
    console.error('Update profile error:', error);

    // Handle user not found error
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found',
      });
    }

    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message,
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
