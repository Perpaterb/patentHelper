/**
 * Item Registry Controller (Group-Level)
 *
 * Handles CRUD operations for group item registries (books, tools, equipment).
 * Different from gift registries - tracks storage, category, borrowed status, replacement value.
 * Members can also link their personal item registries to the group.
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
 * Get all item registries for a group (both group-owned and linked personal registries)
 * GET /groups/:groupId/item-registries
 */
async function getItemRegistries(req, res) {
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

    // Get group-owned item registries
    const groupRegistries = await prisma.itemRegistry.findMany({
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
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
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

    // Get linked personal item registries
    const linkedRegistries = await prisma.personalItemRegistryGroupLink.findMany({
      where: {
        groupId: groupId,
      },
      include: {
        registry: {
          include: {
            user: {
              select: {
                userId: true,
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
            items: {
              select: {
                itemId: true,
              },
            },
          },
        },
        linker: {
          select: {
            groupMemberId: true,
            displayName: true,
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        linkedAt: 'desc',
      },
    });

    // Format group registries
    const formattedGroupRegistries = groupRegistries.map(registry => ({
      registryId: registry.registryId,
      type: 'group',
      name: registry.name,
      sharingType: registry.sharingType,
      webToken: registry.webToken,
      itemCount: registry.items.length,
      creator: {
        groupMemberId: registry.creator.groupMemberId,
        // Use User profile name if available, otherwise fall back to GroupMember name
        displayName: registry.creator.user?.displayName || registry.creator.displayName,
        iconLetters: registry.creator.user?.memberIcon || registry.creator.iconLetters,
        iconColor: registry.creator.user?.iconColor || registry.creator.iconColor,
      },
      creatorId: registry.creatorId,
      isOwner: registry.creatorId === membership.groupMemberId,
      createdAt: registry.createdAt,
      updatedAt: registry.updatedAt,
    }));

    // Format linked personal registries
    const formattedLinkedRegistries = linkedRegistries.map(link => ({
      registryId: link.registry.registryId,
      type: 'personal_linked',
      name: link.registry.name,
      sharingType: link.registry.sharingType,
      webToken: link.registry.webToken,
      itemCount: link.registry.items.length,
      owner: {
        userId: link.registry.user.userId,
        displayName: link.registry.user.displayName,
        memberIcon: link.registry.user.memberIcon,
        iconColor: link.registry.user.iconColor,
      },
      isOwner: link.registry.userId === req.user.userId,
      // Use User profile name if available, otherwise fall back to GroupMember name
      linkedBy: link.linker.user?.displayName || link.linker.displayName,
      linkedAt: link.linkedAt,
    }));

    // Combine and return
    res.status(200).json({
      success: true,
      registries: {
        group: formattedGroupRegistries,
        linked: formattedLinkedRegistries,
      },
    });
  } catch (error) {
    console.error('Get item registries error:', error);
    res.status(500).json({
      error: 'Failed to get item registries',
      message: error.message,
    });
  }
}

/**
 * Get a specific item registry by ID
 * GET /groups/:groupId/item-registries/:registryId
 */
async function getItemRegistryById(req, res) {
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

    // Try to find as group registry first
    const groupRegistry = await prisma.itemRegistry.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
      include: {
        creator: {
          select: {
            groupMemberId: true,
            displayName: true,
            iconLetters: true,
            iconColor: true,
            user: {
              select: {
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
          },
        },
        items: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (groupRegistry) {
      return res.status(200).json({
        success: true,
        registry: {
          ...groupRegistry,
          type: 'group',
          creator: {
            groupMemberId: groupRegistry.creator.groupMemberId,
            // Use User profile name if available, otherwise fall back to GroupMember name
            displayName: groupRegistry.creator.user?.displayName || groupRegistry.creator.displayName,
            iconLetters: groupRegistry.creator.user?.memberIcon || groupRegistry.creator.iconLetters,
            iconColor: groupRegistry.creator.user?.iconColor || groupRegistry.creator.iconColor,
          },
          isOwner: groupRegistry.creatorId === membership.groupMemberId,
        },
      });
    }

    // Try to find as linked personal registry
    const linkedRegistry = await prisma.personalItemRegistryGroupLink.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
      include: {
        registry: {
          include: {
            user: {
              select: {
                userId: true,
                displayName: true,
                memberIcon: true,
                iconColor: true,
              },
            },
            items: {
              orderBy: {
                displayOrder: 'asc',
              },
            },
          },
        },
        linker: {
          select: {
            groupMemberId: true,
            displayName: true,
          },
        },
      },
    });

    if (linkedRegistry) {
      return res.status(200).json({
        success: true,
        registry: {
          ...linkedRegistry.registry,
          type: 'personal_linked',
          owner: linkedRegistry.registry.user,
          linkedBy: linkedRegistry.linker.displayName,
          linkedAt: linkedRegistry.linkedAt,
          isOwner: linkedRegistry.registry.userId === req.user.userId,
        },
      });
    }

    return res.status(404).json({
      error: 'Not found',
      message: 'Item registry not found in this group',
    });
  } catch (error) {
    console.error('Get item registry by ID error:', error);
    res.status(500).json({
      error: 'Failed to get item registry',
      message: error.message,
    });
  }
}

/**
 * Create a new group item registry
 * POST /groups/:groupId/item-registries
 */
async function createItemRegistry(req, res) {
  try {
    const { groupId } = req.params;
    const { name, sharingType } = req.body;

    // Validate input
    if (!name || !sharingType) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name and sharingType are required',
      });
    }

    if (!['group_only', 'external_link', 'external_link_passcode'].includes(sharingType)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid sharingType. Must be group_only, external_link, or external_link_passcode',
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
    const webToken = sharingType !== 'group_only' ? generateWebToken() : null;
    const passcode = sharingType === 'external_link_passcode' ? generatePasscode() : null;

    // Create registry
    const registry = await prisma.itemRegistry.create({
      data: {
        groupId: groupId,
        creatorId: membership.groupMemberId,
        name: name,
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
        type: 'group',
      },
    });
  } catch (error) {
    console.error('Create item registry error:', error);
    res.status(500).json({
      error: 'Failed to create item registry',
      message: error.message,
    });
  }
}

/**
 * Update an item registry
 * PUT /groups/:groupId/item-registries/:registryId
 */
async function updateItemRegistry(req, res) {
  try {
    const { groupId, registryId } = req.params;
    const { name, sharingType } = req.body;

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

    // Find registry
    const registry = await prisma.itemRegistry.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Item registry not found',
      });
    }

    // Verify user is the creator
    if (registry.creatorId !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator can update this registry',
      });
    }

    // Build update data
    const updateData = {};
    if (name) updateData.name = name;
    if (sharingType) {
      if (!['group_only', 'external_link', 'external_link_passcode'].includes(sharingType)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid sharingType',
        });
      }
      updateData.sharingType = sharingType;

      // Generate webToken if changing to external sharing
      if (sharingType !== 'group_only' && !registry.webToken) {
        updateData.webToken = generateWebToken();
      }

      // Generate or remove passcode based on sharing type
      if (sharingType === 'external_link_passcode' && !registry.passcode) {
        updateData.passcode = generatePasscode();
      } else if (sharingType !== 'external_link_passcode') {
        updateData.passcode = null;
      }

      // Remove webToken if changing to group_only
      if (sharingType === 'group_only') {
        updateData.webToken = null;
        updateData.passcode = null;
      }
    }

    // Update registry
    const updatedRegistry = await prisma.itemRegistry.update({
      where: {
        registryId: registryId,
      },
      data: updateData,
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
      registry: {
        ...updatedRegistry,
        type: 'group',
      },
    });
  } catch (error) {
    console.error('Update item registry error:', error);
    res.status(500).json({
      error: 'Failed to update item registry',
      message: error.message,
    });
  }
}

/**
 * Delete an item registry
 * DELETE /groups/:groupId/item-registries/:registryId
 */
async function deleteItemRegistry(req, res) {
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

    // Find registry
    const registry = await prisma.itemRegistry.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Item registry not found',
      });
    }

    // Verify user is the creator or an admin
    const isCreator = registry.creatorId === membership.groupMemberId;
    const isAdmin = membership.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator or an admin can delete this registry',
      });
    }

    // Delete registry (CASCADE will delete items)
    await prisma.itemRegistry.delete({
      where: {
        registryId: registryId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Item registry deleted',
    });
  } catch (error) {
    console.error('Delete item registry error:', error);
    res.status(500).json({
      error: 'Failed to delete item registry',
      message: error.message,
    });
  }
}

/**
 * Add an item to a registry
 * POST /groups/:groupId/item-registries/:registryId/items
 */
async function addItem(req, res) {
  try {
    const { groupId, registryId } = req.params;
    const { title, description, photoUrl, storageLocation, category, currentlyBorrowedBy, replacementValue } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Title is required',
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

    // Verify registry exists and user can edit it
    const registry = await prisma.itemRegistry.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Item registry not found',
      });
    }

    // Only creator can add items
    if (registry.creatorId !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator can add items to this registry',
      });
    }

    // Get highest display order
    const highestOrderItem = await prisma.itemRegistryItem.findFirst({
      where: { registryId: registryId },
      orderBy: { displayOrder: 'desc' },
    });

    const displayOrder = (highestOrderItem?.displayOrder || 0) + 1;

    // Create item
    const item = await prisma.itemRegistryItem.create({
      data: {
        registryId: registryId,
        title: title,
        description: description || null,
        photoUrl: photoUrl || null,
        storageLocation: storageLocation || null,
        category: category || null,
        currentlyBorrowedBy: currentlyBorrowedBy || null,
        replacementValue: replacementValue ? parseFloat(replacementValue) : null,
        displayOrder: displayOrder,
      },
    });

    res.status(201).json({
      success: true,
      item: item,
    });
  } catch (error) {
    console.error('Add item error:', error);
    res.status(500).json({
      error: 'Failed to add item',
      message: error.message,
    });
  }
}

/**
 * Update an item
 * PUT /groups/:groupId/item-registries/:registryId/items/:itemId
 */
async function updateItem(req, res) {
  try {
    const { groupId, registryId, itemId } = req.params;
    const { title, description, photoUrl, storageLocation, category, currentlyBorrowedBy, replacementValue } = req.body;

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

    // Verify registry exists and user can edit it
    const registry = await prisma.itemRegistry.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Item registry not found',
      });
    }

    // Only creator can update items
    if (registry.creatorId !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator can update items in this registry',
      });
    }

    // Verify item exists
    const item = await prisma.itemRegistryItem.findFirst({
      where: {
        itemId: itemId,
        registryId: registryId,
      },
    });

    if (!item) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Item not found in this registry',
      });
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
    if (storageLocation !== undefined) updateData.storageLocation = storageLocation || null;
    if (category !== undefined) updateData.category = category || null;
    if (currentlyBorrowedBy !== undefined) updateData.currentlyBorrowedBy = currentlyBorrowedBy || null;
    if (replacementValue !== undefined) updateData.replacementValue = replacementValue ? parseFloat(replacementValue) : null;

    // Update item
    const updatedItem = await prisma.itemRegistryItem.update({
      where: {
        itemId: itemId,
      },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      item: updatedItem,
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      error: 'Failed to update item',
      message: error.message,
    });
  }
}

/**
 * Delete an item
 * DELETE /groups/:groupId/item-registries/:registryId/items/:itemId
 */
async function deleteItem(req, res) {
  try {
    const { groupId, registryId, itemId } = req.params;

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

    // Verify registry exists and user can edit it
    const registry = await prisma.itemRegistry.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Item registry not found',
      });
    }

    // Only creator can delete items
    if (registry.creatorId !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator can delete items from this registry',
      });
    }

    // Verify item exists
    const item = await prisma.itemRegistryItem.findFirst({
      where: {
        itemId: itemId,
        registryId: registryId,
      },
    });

    if (!item) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Item not found in this registry',
      });
    }

    // Delete item
    await prisma.itemRegistryItem.delete({
      where: {
        itemId: itemId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Item deleted',
    });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({
      error: 'Failed to delete item',
      message: error.message,
    });
  }
}

/**
 * Reorder items
 * PUT /groups/:groupId/item-registries/:registryId/items/reorder
 */
async function reorderItems(req, res) {
  try {
    const { groupId, registryId } = req.params;
    const { itemOrders } = req.body; // Array of { itemId, displayOrder }

    if (!Array.isArray(itemOrders)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'itemOrders must be an array',
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

    // Verify registry exists and user can edit it
    const registry = await prisma.itemRegistry.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
    });

    if (!registry) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Item registry not found',
      });
    }

    // Only creator can reorder items
    if (registry.creatorId !== membership.groupMemberId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the creator can reorder items in this registry',
      });
    }

    // Update all items in a transaction
    await prisma.$transaction(
      itemOrders.map(({ itemId, displayOrder }) =>
        prisma.itemRegistryItem.updateMany({
          where: { itemId, registryId }, // Ensure item belongs to this registry
          data: { displayOrder },
        })
      )
    );

    res.status(200).json({
      success: true,
      message: 'Items reordered',
    });
  } catch (error) {
    console.error('Reorder items error:', error);
    res.status(500).json({
      error: 'Failed to reorder items',
      message: error.message,
    });
  }
}

/**
 * Link personal item registry to group
 * POST /groups/:groupId/item-registries/:registryId/link
 */
async function linkPersonalRegistry(req, res) {
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

    // Verify personal registry exists and belongs to user
    const personalRegistry = await prisma.personalItemRegistry.findUnique({
      where: {
        registryId: registryId,
      },
    });

    if (!personalRegistry) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Personal registry not found',
      });
    }

    if (personalRegistry.userId !== req.user.userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only link your own personal registries',
      });
    }

    // Check if already linked
    const existingLink = await prisma.personalItemRegistryGroupLink.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
    });

    if (existingLink) {
      return res.status(400).json({
        error: 'Already linked',
        message: 'This registry is already linked to this group',
      });
    }

    // Create link
    await prisma.personalItemRegistryGroupLink.create({
      data: {
        registryId: registryId,
        groupId: groupId,
        linkedBy: membership.groupMemberId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Personal registry linked to group successfully',
    });
  } catch (error) {
    console.error('Link personal registry error:', error);
    res.status(500).json({
      error: 'Failed to link personal registry',
      message: error.message,
    });
  }
}

/**
 * Unlink personal item registry from group
 * DELETE /groups/:groupId/item-registries/:registryId/unlink
 */
async function unlinkPersonalRegistry(req, res) {
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

    // Verify link exists
    const link = await prisma.personalItemRegistryGroupLink.findFirst({
      where: {
        registryId: registryId,
        groupId: groupId,
      },
      include: {
        registry: true,
      },
    });

    if (!link) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Registry link not found',
      });
    }

    // Only the owner or group admins can unlink
    const canUnlink = link.registry.userId === req.user.userId || membership.role === 'admin';

    if (!canUnlink) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the owner or group admins can unlink this registry',
      });
    }

    // Delete link
    await prisma.personalItemRegistryGroupLink.delete({
      where: {
        linkId: link.linkId,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Personal registry unlinked from group successfully',
    });
  } catch (error) {
    console.error('Unlink personal registry error:', error);
    res.status(500).json({
      error: 'Failed to unlink personal registry',
      message: error.message,
    });
  }
}

module.exports = {
  getItemRegistries,
  getItemRegistryById,
  createItemRegistry,
  updateItemRegistry,
  deleteItemRegistry,
  addItem,
  updateItem,
  deleteItem,
  reorderItems,
  linkPersonalRegistry,
  unlinkPersonalRegistry,
};
