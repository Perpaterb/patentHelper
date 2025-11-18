/**
 * Personal Gift Registry Controller
 *
 * Handles user-level gift registries that can be linked to multiple groups.
 * Users create and manage these in My Account screen.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

/**
 * Generate a unique 32-character hex web token
 * @returns {Promise<string>} Unique web token
 */
async function generateUniqueWebToken() {
  let token;
  let exists = true;

  while (exists) {
    token = crypto.randomBytes(16).toString('hex'); // 32 chars
    const existing = await prisma.personalGiftRegistry.findUnique({
      where: { webToken: token }
    });
    exists = !!existing;
  }

  return token;
}

/**
 * Generate a 6-digit passcode
 * @returns {string} 6-digit passcode
 */
function generatePasscode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * GET /users/personal-gift-registries
 * Get all personal gift registries for the current user
 */
exports.getPersonalGiftRegistries = async (req, res) => {
  try {
    const userId = req.user.userId;

    const registries = await prisma.personalGiftRegistry.findMany({
      where: { userId },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' }
        },
        groupLinks: {
          include: {
            group: {
              select: {
                groupId: true,
                name: true,
                icon: true,
                backgroundColor: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      registries: registries.map(registry => ({
        registryId: registry.registryId,
        name: registry.name,
        sharingType: registry.sharingType,
        webToken: registry.webToken,
        hasPasscode: !!registry.passcode,
        itemCount: registry.items.length,
        linkedGroups: registry.groupLinks.map(link => ({
          groupId: link.group.groupId,
          groupName: link.group.name,
          groupIcon: link.group.icon,
          groupColor: link.group.backgroundColor,
          linkedAt: link.linkedAt
        })),
        createdAt: registry.createdAt,
        updatedAt: registry.updatedAt
      }))
    });
  } catch (error) {
    console.error('Get personal gift registries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal gift registries'
    });
  }
};

/**
 * GET /users/personal-gift-registries/:registryId
 * Get a specific personal gift registry with all items
 *
 * Access: Registry owner OR members of groups where this registry is linked
 */
exports.getPersonalGiftRegistryById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;

    // First, try to find the registry
    const registry = await prisma.personalGiftRegistry.findUnique({
      where: { registryId },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' }
        },
        groupLinks: {
          include: {
            group: {
              select: {
                groupId: true,
                name: true,
                icon: true,
                backgroundColor: true
              }
            },
            linker: {
              select: {
                displayName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Check if user has access to this registry
    // User has access if they are:
    // 1. The owner of the registry, OR
    // 2. A member of any group where this registry is linked
    const isOwner = registry.userId === userId;

    let hasGroupAccess = false;
    if (!isOwner && registry.groupLinks.length > 0) {
      // Check if user is a member of any linked groups
      const linkedGroupIds = registry.groupLinks.map(link => link.groupId);
      const userGroupMembership = await prisma.groupMember.findFirst({
        where: {
          userId: userId,
          groupId: { in: linkedGroupIds }
        }
      });

      hasGroupAccess = !!userGroupMembership;
    }

    if (!isOwner && !hasGroupAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this registry.'
      });
    }

    return res.json({
      success: true,
      registry: {
        registryId: registry.registryId,
        name: registry.name,
        sharingType: registry.sharingType,
        webToken: registry.webToken,
        passcode: registry.passcode,
        items: registry.items,
        isOwner: isOwner, // Add flag so frontend knows if user is the owner
        linkedGroups: registry.groupLinks.map(link => ({
          linkId: link.linkId,
          groupId: link.group.groupId,
          groupName: link.group.name,
          groupIcon: link.group.icon,
          groupColor: link.group.backgroundColor,
          linkedBy: link.linker.displayName || link.linker.email,
          linkedAt: link.linkedAt
        })),
        createdAt: registry.createdAt,
        updatedAt: registry.updatedAt
      }
    });
  } catch (error) {
    console.error('Get personal gift registry by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal gift registry'
    });
  }
};

/**
 * POST /users/personal-gift-registries
 * Create a new personal gift registry
 */
exports.createPersonalGiftRegistry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, sharingType } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Registry name is required'
      });
    }

    if (!['external_link', 'external_link_passcode'].includes(sharingType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sharing type. Must be external_link or external_link_passcode'
      });
    }

    // Generate web token and optional passcode
    const webToken = await generateUniqueWebToken();
    const passcode = sharingType === 'external_link_passcode' ? generatePasscode() : null;

    const registry = await prisma.personalGiftRegistry.create({
      data: {
        userId,
        name: name.trim(),
        sharingType,
        webToken,
        passcode
      }
    });

    return res.status(201).json({
      success: true,
      registry: {
        registryId: registry.registryId,
        name: registry.name,
        sharingType: registry.sharingType,
        webToken: registry.webToken,
        passcode: registry.passcode,
        createdAt: registry.createdAt
      }
    });
  } catch (error) {
    console.error('Create personal gift registry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create personal gift registry'
    });
  }
};

/**
 * PUT /users/personal-gift-registries/:registryId
 * Update a personal gift registry
 */
exports.updatePersonalGiftRegistry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;
    const { name, sharingType } = req.body;

    // Verify ownership
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Validation
    const updates = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Registry name must be a non-empty string'
        });
      }
      updates.name = name.trim();
    }

    if (sharingType !== undefined) {
      if (!['external_link', 'external_link_passcode'].includes(sharingType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sharing type'
        });
      }
      updates.sharingType = sharingType;

      // Add passcode if changing to external_link_passcode
      if (sharingType === 'external_link_passcode' && !registry.passcode) {
        updates.passcode = generatePasscode();
      }

      // Remove passcode if changing to external_link
      if (sharingType === 'external_link') {
        updates.passcode = null;
      }
    }

    const updatedRegistry = await prisma.personalGiftRegistry.update({
      where: { registryId },
      data: updates
    });

    return res.json({
      success: true,
      registry: {
        registryId: updatedRegistry.registryId,
        name: updatedRegistry.name,
        sharingType: updatedRegistry.sharingType,
        passcode: updatedRegistry.passcode,
        updatedAt: updatedRegistry.updatedAt
      }
    });
  } catch (error) {
    console.error('Update personal gift registry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update personal gift registry'
    });
  }
};

/**
 * PUT /users/personal-gift-registries/:registryId/reset-passcode
 * Reset the passcode for a personal gift registry
 */
exports.resetPasscode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;

    // Verify ownership
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    if (registry.sharingType !== 'external_link_passcode') {
      return res.status(400).json({
        success: false,
        message: 'This registry does not use passcodes'
      });
    }

    const newPasscode = generatePasscode();

    const updatedRegistry = await prisma.personalGiftRegistry.update({
      where: { registryId },
      data: { passcode: newPasscode }
    });

    return res.json({
      success: true,
      passcode: updatedRegistry.passcode
    });
  } catch (error) {
    console.error('Reset passcode error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset passcode'
    });
  }
};

/**
 * DELETE /users/personal-gift-registries/:registryId
 * Delete a personal gift registry
 */
exports.deletePersonalGiftRegistry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;

    // Verify ownership
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Delete registry (CASCADE will delete items and links)
    await prisma.personalGiftRegistry.delete({
      where: { registryId }
    });

    return res.json({
      success: true,
      message: 'Personal gift registry deleted'
    });
  } catch (error) {
    console.error('Delete personal gift registry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete personal gift registry'
    });
  }
};

/**
 * POST /users/personal-gift-registries/:registryId/items
 * Add an item to a personal gift registry
 */
exports.addItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;
    const { title, link, photoUrl, cost, description } = req.body;

    // Verify ownership
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item title is required'
      });
    }

    // Get the highest display_order
    const highestOrderItem = await prisma.personalGiftItem.findFirst({
      where: { registryId },
      orderBy: { displayOrder: 'desc' }
    });

    const displayOrder = (highestOrderItem?.displayOrder || 0) + 1;

    const item = await prisma.personalGiftItem.create({
      data: {
        registryId,
        title: title.trim(),
        link: link || null,
        photoUrl: photoUrl || null,
        cost: cost ? parseFloat(cost) : null,
        description: description || null,
        displayOrder
      }
    });

    return res.status(201).json({
      success: true,
      item
    });
  } catch (error) {
    console.error('Add item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add item to registry'
    });
  }
};

/**
 * PUT /users/personal-gift-registries/:registryId/items/:itemId
 * Update an item in a personal gift registry
 */
exports.updateItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId, itemId } = req.params;
    const { title, link, photoUrl, cost, description } = req.body;

    // Verify ownership of registry
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Verify item exists in registry
    const item = await prisma.personalGiftItem.findFirst({
      where: { itemId, registryId }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in this registry'
      });
    }

    // Build updates
    const updates = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title must be a non-empty string'
        });
      }
      updates.title = title.trim();
    }
    if (link !== undefined) updates.link = link || null;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl || null;
    if (cost !== undefined) updates.cost = cost ? parseFloat(cost) : null;
    if (description !== undefined) updates.description = description || null;

    const updatedItem = await prisma.personalGiftItem.update({
      where: { itemId },
      data: updates
    });

    return res.json({
      success: true,
      item: updatedItem
    });
  } catch (error) {
    console.error('Update item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update item'
    });
  }
};

/**
 * DELETE /users/personal-gift-registries/:registryId/items/:itemId
 * Delete an item from a personal gift registry
 */
exports.deleteItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId, itemId } = req.params;

    // Verify ownership of registry
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Verify item exists in registry
    const item = await prisma.personalGiftItem.findFirst({
      where: { itemId, registryId }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in this registry'
      });
    }

    await prisma.personalGiftItem.delete({
      where: { itemId }
    });

    return res.json({
      success: true,
      message: 'Item deleted'
    });
  } catch (error) {
    console.error('Delete item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete item'
    });
  }
};

/**
 * PUT /users/personal-gift-registries/:registryId/items/reorder
 * Reorder items in a personal gift registry
 */
exports.reorderItems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;
    const { itemOrders } = req.body; // Array of { itemId, displayOrder }

    // Verify ownership
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Validation
    if (!Array.isArray(itemOrders)) {
      return res.status(400).json({
        success: false,
        message: 'itemOrders must be an array'
      });
    }

    // Update all items in a transaction
    await prisma.$transaction(
      itemOrders.map(({ itemId, displayOrder }) =>
        prisma.personalGiftItem.updateMany({
          where: { itemId, registryId }, // Ensure item belongs to this registry
          data: { displayOrder }
        })
      )
    );

    return res.json({
      success: true,
      message: 'Items reordered successfully'
    });
  } catch (error) {
    console.error('Reorder items error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder items'
    });
  }
};

/**
 * POST /users/personal-gift-registries/:registryId/link-to-group/:groupId
 * Link a personal gift registry to a group
 */
exports.linkToGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId, groupId } = req.params;

    // Verify ownership of registry
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Verify user is a member of the group
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId
      }
    });

    if (!groupMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }

    // Check if already linked
    const existingLink = await prisma.personalGiftRegistryGroupLink.findUnique({
      where: {
        registryId_groupId: {
          registryId,
          groupId
        }
      }
    });

    if (existingLink) {
      return res.status(400).json({
        success: false,
        message: 'Registry is already linked to this group'
      });
    }

    // Create link
    const link = await prisma.personalGiftRegistryGroupLink.create({
      data: {
        registryId,
        groupId,
        linkedBy: groupMember.groupMemberId
      },
      include: {
        group: {
          select: {
            groupId: true,
            name: true,
            icon: true,
            backgroundColor: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      link: {
        linkId: link.linkId,
        registryId: link.registryId,
        groupId: link.group.groupId,
        groupName: link.group.name,
        groupIcon: link.group.icon,
        groupColor: link.group.backgroundColor,
        linkedAt: link.linkedAt
      }
    });
  } catch (error) {
    console.error('Link to group error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to link registry to group'
    });
  }
};

/**
 * DELETE /users/personal-gift-registries/:registryId/unlink-from-group/:groupId
 * Unlink a personal gift registry from a group
 */
exports.unlinkFromGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId, groupId } = req.params;

    // Verify ownership of registry
    const registry = await prisma.personalGiftRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal gift registry not found'
      });
    }

    // Find and delete link
    const link = await prisma.personalGiftRegistryGroupLink.findUnique({
      where: {
        registryId_groupId: {
          registryId,
          groupId
        }
      }
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Registry is not linked to this group'
      });
    }

    await prisma.personalGiftRegistryGroupLink.delete({
      where: {
        registryId_groupId: {
          registryId,
          groupId
        }
      }
    });

    return res.json({
      success: true,
      message: 'Registry unlinked from group'
    });
  } catch (error) {
    console.error('Unlink from group error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unlink registry from group'
    });
  }
};
