/**
 * Personal Item Registry Controller
 *
 * Handles user-level item registries (books, tools, equipment) that can be linked to multiple groups.
 * Users create and manage these in My Account screen.
 * Different from gift registries - tracks storage, category, borrowed status, replacement value.
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
    const existing = await prisma.personalItemRegistry.findUnique({
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
 * GET /users/personal-item-registries
 * Get all personal item registries for the current user
 */
exports.getPersonalItemRegistries = async (req, res) => {
  try {
    const userId = req.user.userId;

    const registries = await prisma.personalItemRegistry.findMany({
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
    console.error('Get personal item registries error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal item registries'
    });
  }
};

/**
 * GET /users/personal-item-registries/:registryId
 * Get a specific personal item registry with all items
 */
exports.getPersonalItemRegistryById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;

    const registry = await prisma.personalItemRegistry.findFirst({
      where: {
        registryId,
        userId
      },
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
        message: 'Personal item registry not found'
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
    console.error('Get personal item registry by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch personal item registry'
    });
  }
};

/**
 * POST /users/personal-item-registries
 * Create a new personal item registry
 */
exports.createPersonalItemRegistry = async (req, res) => {
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

    const registry = await prisma.personalItemRegistry.create({
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
    console.error('Create personal item registry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create personal item registry'
    });
  }
};

/**
 * PUT /users/personal-item-registries/:registryId
 * Update a personal item registry
 */
exports.updatePersonalItemRegistry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;
    const { name, sharingType } = req.body;

    // Verify ownership
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
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

    const updatedRegistry = await prisma.personalItemRegistry.update({
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
    console.error('Update personal item registry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update personal item registry'
    });
  }
};

/**
 * PUT /users/personal-item-registries/:registryId/reset-passcode
 * Reset the passcode for a personal item registry
 */
exports.resetPasscode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;

    // Verify ownership
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
      });
    }

    if (registry.sharingType !== 'external_link_passcode') {
      return res.status(400).json({
        success: false,
        message: 'This registry does not use passcodes'
      });
    }

    const newPasscode = generatePasscode();

    const updatedRegistry = await prisma.personalItemRegistry.update({
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
 * DELETE /users/personal-item-registries/:registryId
 * Delete a personal item registry
 */
exports.deletePersonalItemRegistry = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;

    // Verify ownership
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
      });
    }

    // Delete registry (CASCADE will delete items and links)
    await prisma.personalItemRegistry.delete({
      where: { registryId }
    });

    return res.json({
      success: true,
      message: 'Personal item registry deleted'
    });
  } catch (error) {
    console.error('Delete personal item registry error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete personal item registry'
    });
  }
};

/**
 * POST /users/personal-item-registries/:registryId/items
 * Add an item to a personal item registry
 */
exports.addItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;
    const { title, description, photoUrl, storageLocation, category, currentlyBorrowedBy, replacementValue } = req.body;

    // Verify ownership
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
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
    const highestOrderItem = await prisma.personalItemRegistryItem.findFirst({
      where: { registryId },
      orderBy: { displayOrder: 'desc' }
    });

    const displayOrder = (highestOrderItem?.displayOrder || 0) + 1;

    const item = await prisma.personalItemRegistryItem.create({
      data: {
        registryId,
        title: title.trim(),
        description: description || null,
        photoUrl: photoUrl || null,
        storageLocation: storageLocation || null,
        category: category || null,
        currentlyBorrowedBy: currentlyBorrowedBy || null,
        replacementValue: replacementValue ? parseFloat(replacementValue) : null,
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
 * PUT /users/personal-item-registries/:registryId/items/:itemId
 * Update an item in a personal item registry
 */
exports.updateItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId, itemId } = req.params;
    const { title, description, photoUrl, storageLocation, category, currentlyBorrowedBy, replacementValue } = req.body;

    // Verify ownership of registry
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
      });
    }

    // Verify item exists in registry
    const item = await prisma.personalItemRegistryItem.findFirst({
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
    if (description !== undefined) updates.description = description || null;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl || null;
    if (storageLocation !== undefined) updates.storageLocation = storageLocation || null;
    if (category !== undefined) updates.category = category || null;
    if (currentlyBorrowedBy !== undefined) updates.currentlyBorrowedBy = currentlyBorrowedBy || null;
    if (replacementValue !== undefined) updates.replacementValue = replacementValue ? parseFloat(replacementValue) : null;

    const updatedItem = await prisma.personalItemRegistryItem.update({
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
 * DELETE /users/personal-item-registries/:registryId/items/:itemId
 * Delete an item from a personal item registry
 */
exports.deleteItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId, itemId } = req.params;

    // Verify ownership of registry
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
      });
    }

    // Verify item exists in registry
    const item = await prisma.personalItemRegistryItem.findFirst({
      where: { itemId, registryId }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in this registry'
      });
    }

    await prisma.personalItemRegistryItem.delete({
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
 * PUT /users/personal-item-registries/:registryId/items/reorder
 * Reorder items in a personal item registry
 */
exports.reorderItems = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId } = req.params;
    const { itemOrders } = req.body; // Array of { itemId, displayOrder }

    // Verify ownership
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
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
        prisma.personalItemRegistryItem.updateMany({
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
 * POST /users/personal-item-registries/:registryId/link-to-group/:groupId
 * Link a personal item registry to a group
 */
exports.linkToGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId, groupId } = req.params;

    // Verify ownership of registry
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
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
    const existingLink = await prisma.personalItemRegistryGroupLink.findUnique({
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
    const link = await prisma.personalItemRegistryGroupLink.create({
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

    // Get user info for audit log
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { email: true }
    });

    // Create audit log for linking registry to group
    await prisma.auditLog.create({
      data: {
        groupId: groupId,
        action: 'link_personal_item_registry',
        performedBy: groupMember.groupMemberId,
        performedByName: groupMember.displayName,
        performedByEmail: user?.email || 'N/A',
        actionLocation: 'item_registry',
        messageContent: `Linked personal item registry "${registry.name}" to group`,
      },
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
 * DELETE /users/personal-item-registries/:registryId/unlink-from-group/:groupId
 * Unlink a personal item registry from a group
 */
exports.unlinkFromGroup = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { registryId, groupId } = req.params;

    // Verify ownership of registry
    const registry = await prisma.personalItemRegistry.findFirst({
      where: { registryId, userId }
    });

    if (!registry) {
      return res.status(404).json({
        success: false,
        message: 'Personal item registry not found'
      });
    }

    // Find and delete link
    const link = await prisma.personalItemRegistryGroupLink.findUnique({
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

    await prisma.personalItemRegistryGroupLink.delete({
      where: {
        registryId_groupId: {
          registryId,
          groupId
        }
      }
    });

    // Get group member info for audit log
    const groupMember = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId
      }
    });

    // Get user info for audit log
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { email: true }
    });

    // Create audit log for unlinking registry from group
    if (groupMember) {
      await prisma.auditLog.create({
        data: {
          groupId: groupId,
          action: 'unlink_personal_item_registry',
          performedBy: groupMember.groupMemberId,
          performedByName: groupMember.displayName,
          performedByEmail: user?.email || 'N/A',
          actionLocation: 'item_registry',
          messageContent: `Unlinked personal item registry "${registry.name}" from group`,
        },
      });
    }

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
