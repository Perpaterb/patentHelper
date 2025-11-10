/**
 * Gift Registry Controller
 *
 * Handles CRUD operations for gift registries and items.
 * Gift registries are shareable wishlists for birthdays, holidays, etc.
 */

const { prisma } = require('../config/database');
const crypto = require('crypto');

/**
 * Generate a cryptographically random web token for shareable URLs
 * @returns {string} 32-character random token
 */
function generateWebToken() {
  return crypto.randomBytes(16).toString('hex'); // 16 bytes = 32 hex chars
}

/**
 * Generate a random 6-digit passcode
 * @returns {string} 6-digit passcode
 */
function generatePasscode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get all gift registries for a group
 * GET /groups/:groupId/gift-registries
 */
async function getGiftRegistries(req, res) {
  try {
    const { groupId } = req.params;

    // Verify user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    // Get all registries for this group
    const registries = await prisma.giftRegistry.findMany({
      where: {
        groupId: groupId,
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
          },
        },
        items: {
          select: {
            itemId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format response
    const formattedRegistries = registries.map(registry => ({
      registryId: registry.registryId,
      name: registry.name,
      sharingType: registry.sharingType,
      webToken: registry.webToken,
      itemCount: registry.items.length,
      creator: registry.creator,
      createdAt: registry.createdAt,
      updatedAt: registry.updatedAt,
    }));

    res.status(200).json({
      success: true,
      registries: formattedRegistries,
    });
  } catch (error) {
    console.error('Get gift registries error:', error);
    res.status(500).json({
      error: 'Failed to get gift registries',
      message: error.message,
    });
  }
}

/**
 * Get a single gift registry with all items
 * GET /groups/:groupId/gift-registries/:registryId
 */
async function getGiftRegistry(req, res) {
  try {
    const { groupId, registryId } = req.params;

    // Verify user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    // Get registry with items
    const registry = await prisma.giftRegistry.findUnique({
      where: {
        registryId: registryId,
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            role: true,
          },
        },
        items: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Registry not found',
        message: 'Gift registry not found',
      });
    }

    // Verify registry belongs to this group
    if (registry.groupId !== groupId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Registry does not belong to this group',
      });
    }

    // Check if user can edit (creator or admin)
    const canEdit = registry.creatorId === membership.groupMemberId || membership.role === 'admin';

    res.status(200).json({
      success: true,
      registry: {
        ...registry,
        canEdit: canEdit,
        hasPasscode: !!registry.passcode,
      },
    });
  } catch (error) {
    console.error('Get gift registry error:', error);
    res.status(500).json({
      error: 'Failed to get gift registry',
      message: error.message,
    });
  }
}

/**
 * Create a new gift registry
 * POST /groups/:groupId/gift-registries
 * Body: { name, sharingType }
 */
async function createGiftRegistry(req, res) {
  try {
    const { groupId } = req.params;
    const { name, sharingType } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Registry name is required',
      });
    }

    if (!['public', 'passcode', 'group_only'].includes(sharingType)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Sharing type must be: public, passcode, or group_only',
      });
    }

    // Verify user is a member of this group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    // Generate web token and passcode if needed
    const webToken = generateWebToken();
    const passcode = sharingType === 'passcode' ? generatePasscode() : null;

    // Create registry
    const registry = await prisma.giftRegistry.create({
      data: {
        groupId: groupId,
        creatorId: membership.groupMemberId,
        name: name.trim(),
        sharingType: sharingType,
        webToken: webToken,
        passcode: passcode,
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      registry: {
        ...registry,
        itemCount: 0,
      },
    });
  } catch (error) {
    console.error('Create gift registry error:', error);
    res.status(500).json({
      error: 'Failed to create gift registry',
      message: error.message,
    });
  }
}

/**
 * Update a gift registry
 * PUT /groups/:groupId/gift-registries/:registryId
 * Body: { name }
 */
async function updateGiftRegistry(req, res) {
  try {
    const { groupId, registryId } = req.params;
    const { name } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Registry name is required',
      });
    }

    // Get registry
    const registry = await prisma.giftRegistry.findUnique({
      where: {
        registryId: registryId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Registry not found',
        message: 'Gift registry not found',
      });
    }

    // Verify registry belongs to this group
    if (registry.groupId !== groupId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Registry does not belong to this group',
      });
    }

    // Verify user can edit (creator or admin)
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    const canEdit = registry.creatorId === membership.groupMemberId || membership.role === 'admin';

    if (!canEdit) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator or admins can edit this registry',
      });
    }

    // Update registry
    const updatedRegistry = await prisma.giftRegistry.update({
      where: {
        registryId: registryId,
      },
      data: {
        name: name.trim(),
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      registry: updatedRegistry,
    });
  } catch (error) {
    console.error('Update gift registry error:', error);
    res.status(500).json({
      error: 'Failed to update gift registry',
      message: error.message,
    });
  }
}

/**
 * Delete a gift registry
 * DELETE /groups/:groupId/gift-registries/:registryId
 */
async function deleteGiftRegistry(req, res) {
  try {
    const { groupId, registryId } = req.params;

    // Get registry
    const registry = await prisma.giftRegistry.findUnique({
      where: {
        registryId: registryId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Registry not found',
        message: 'Gift registry not found',
      });
    }

    // Verify registry belongs to this group
    if (registry.groupId !== groupId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Registry does not belong to this group',
      });
    }

    // Verify user can delete (creator or admin)
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    const canDelete = registry.creatorId === membership.groupMemberId || membership.role === 'admin';

    if (!canDelete) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator or admins can delete this registry',
      });
    }

    // Delete registry (items will cascade delete)
    await prisma.giftRegistry.delete({
      where: {
        registryId: registryId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Gift registry deleted successfully',
    });
  } catch (error) {
    console.error('Delete gift registry error:', error);
    res.status(500).json({
      error: 'Failed to delete gift registry',
      message: error.message,
    });
  }
}

/**
 * Reset passcode for a registry
 * POST /groups/:groupId/gift-registries/:registryId/reset-passcode
 */
async function resetPasscode(req, res) {
  try {
    const { groupId, registryId } = req.params;

    // Get registry
    const registry = await prisma.giftRegistry.findUnique({
      where: {
        registryId: registryId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Registry not found',
        message: 'Gift registry not found',
      });
    }

    // Verify registry belongs to this group
    if (registry.groupId !== groupId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Registry does not belong to this group',
      });
    }

    // Verify registry uses passcode
    if (registry.sharingType !== 'passcode') {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Registry does not use passcode sharing',
      });
    }

    // Verify user can edit (creator or admin)
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    const canEdit = registry.creatorId === membership.groupMemberId || membership.role === 'admin';

    if (!canEdit) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator or admins can reset the passcode',
      });
    }

    // Generate new passcode
    const newPasscode = generatePasscode();

    // Update registry
    await prisma.giftRegistry.update({
      where: {
        registryId: registryId,
      },
      data: {
        passcode: newPasscode,
      },
    });

    res.status(200).json({
      success: true,
      passcode: newPasscode,
      message: 'Passcode reset successfully',
    });
  } catch (error) {
    console.error('Reset passcode error:', error);
    res.status(500).json({
      error: 'Failed to reset passcode',
      message: error.message,
    });
  }
}

/**
 * Add an item to a registry
 * POST /groups/:groupId/gift-registries/:registryId/items
 * Body: { title, link, photoUrl, cost, description }
 */
async function addGiftItem(req, res) {
  try {
    const { groupId, registryId } = req.params;
    const { title, link, photoUrl, cost, description } = req.body;

    // Validate input
    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Item title is required',
      });
    }

    // Get registry
    const registry = await prisma.giftRegistry.findUnique({
      where: {
        registryId: registryId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Registry not found',
        message: 'Gift registry not found',
      });
    }

    // Verify registry belongs to this group
    if (registry.groupId !== groupId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Registry does not belong to this group',
      });
    }

    // Verify user can edit (creator or admin)
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    const canEdit = registry.creatorId === membership.groupMemberId || membership.role === 'admin';

    if (!canEdit) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator or admins can add items to this registry',
      });
    }

    // Get current max display order
    const maxOrder = await prisma.giftItem.aggregate({
      where: {
        registryId: registryId,
      },
      _max: {
        displayOrder: true,
      },
    });

    const nextOrder = (maxOrder._max.displayOrder || 0) + 1;

    // Create item
    const item = await prisma.giftItem.create({
      data: {
        registryId: registryId,
        title: title.trim(),
        link: link?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        cost: cost ? parseFloat(cost) : null,
        description: description?.trim() || null,
        displayOrder: nextOrder,
      },
    });

    res.status(201).json({
      success: true,
      item: item,
    });
  } catch (error) {
    console.error('Add gift item error:', error);
    res.status(500).json({
      error: 'Failed to add gift item',
      message: error.message,
    });
  }
}

/**
 * Update a gift item
 * PUT /groups/:groupId/gift-registries/:registryId/items/:itemId
 * Body: { title, link, photoUrl, cost, description }
 */
async function updateGiftItem(req, res) {
  try {
    const { groupId, registryId, itemId } = req.params;
    const { title, link, photoUrl, cost, description } = req.body;

    // Validate input
    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Item title is required',
      });
    }

    // Get item with registry
    const item = await prisma.giftItem.findUnique({
      where: {
        itemId: itemId,
      },
      include: {
        registry: true,
      },
    });

    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Gift item not found',
      });
    }

    // Verify item belongs to this registry and group
    if (item.registryId !== registryId || item.registry.groupId !== groupId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Item does not belong to this registry',
      });
    }

    // Verify user can edit (creator or admin)
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    const canEdit = item.registry.creatorId === membership.groupMemberId || membership.role === 'admin';

    if (!canEdit) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator or admins can edit items in this registry',
      });
    }

    // Update item
    const updatedItem = await prisma.giftItem.update({
      where: {
        itemId: itemId,
      },
      data: {
        title: title.trim(),
        link: link?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        cost: cost ? parseFloat(cost) : null,
        description: description?.trim() || null,
      },
    });

    res.status(200).json({
      success: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error('Update gift item error:', error);
    res.status(500).json({
      error: 'Failed to update gift item',
      message: error.message,
    });
  }
}

/**
 * Delete a gift item
 * DELETE /groups/:groupId/gift-registries/:registryId/items/:itemId
 */
async function deleteGiftItem(req, res) {
  try {
    const { groupId, registryId, itemId } = req.params;

    // Get item with registry
    const item = await prisma.giftItem.findUnique({
      where: {
        itemId: itemId,
      },
      include: {
        registry: true,
      },
    });

    if (!item) {
      return res.status(404).json({
        error: 'Item not found',
        message: 'Gift item not found',
      });
    }

    // Verify item belongs to this registry and group
    if (item.registryId !== registryId || item.registry.groupId !== groupId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Item does not belong to this registry',
      });
    }

    // Verify user can delete (creator or admin)
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: groupId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You are not a member of this group',
      });
    }

    const canDelete = item.registry.creatorId === membership.groupMemberId || membership.role === 'admin';

    if (!canDelete) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator or admins can delete items from this registry',
      });
    }

    // Delete item
    await prisma.giftItem.delete({
      where: {
        itemId: itemId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Gift item deleted successfully',
    });
  } catch (error) {
    console.error('Delete gift item error:', error);
    res.status(500).json({
      error: 'Failed to delete gift item',
      message: error.message,
    });
  }
}

module.exports = {
  getGiftRegistries,
  getGiftRegistry,
  createGiftRegistry,
  updateGiftRegistry,
  deleteGiftRegistry,
  resetPasscode,
  addGiftItem,
  updateGiftItem,
  deleteGiftItem,
};
