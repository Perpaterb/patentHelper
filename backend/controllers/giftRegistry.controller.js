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
 * Get all gift registries for a group (both group-owned and linked personal registries)
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

    // Get group-owned gift registries
    const groupRegistries = await prisma.giftRegistry.findMany({
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

    // Get linked personal gift registries
    const linkedRegistries = await prisma.personalGiftRegistryGroupLink.findMany({
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
      creatorId: registry.creatorId, // Include creatorId for permission checks
      creator: registry.creator,
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
      linkedBy: link.linker.displayName,
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
          include: {
            purchaser: {
              select: {
                groupMemberId: true,
                displayName: true,
              },
            },
          },
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

    // Check if user is the owner
    const isOwner = registry.creatorId === membership.groupMemberId;

    // Check if user can edit (creator or admin)
    const canEdit = isOwner || membership.role === 'admin';

    // Filter items based on user role:
    // - Owner: Hide purchased items (to maintain surprise)
    // - Non-owner: Show all items with purchase status
    const filteredItems = isOwner
      ? registry.items.filter(item => !item.isPurchased)
      : registry.items;

    res.status(200).json({
      success: true,
      registry: {
        ...registry,
        items: filteredItems,
        canEdit: canEdit,
        isOwner: isOwner,
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
    // Only generate webToken for public or passcode sharing types (not for group_only)
    const webToken = (sharingType === 'public' || sharingType === 'passcode') ? generateWebToken() : null;
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

/**
 * Link personal gift registry to group
 * POST /groups/:groupId/gift-registries/:registryId/link
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
    const personalRegistry = await prisma.personalGiftRegistry.findUnique({
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
    const existingLink = await prisma.personalGiftRegistryGroupLink.findFirst({
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
    await prisma.personalGiftRegistryGroupLink.create({
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
 * Unlink personal gift registry from group
 * DELETE /groups/:groupId/gift-registries/:registryId/unlink
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
    const link = await prisma.personalGiftRegistryGroupLink.findFirst({
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
    await prisma.personalGiftRegistryGroupLink.delete({
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

/**
 * Mark a gift item as purchased
 * POST /groups/:groupId/gift-registries/:registryId/items/:itemId/mark-purchased
 */
async function markItemAsPurchased(req, res) {
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

    // Prevent owner from marking their own items as purchased
    if (item.registry.creatorId === membership.groupMemberId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Registry owner cannot mark items as purchased',
      });
    }

    // Check if already purchased
    if (item.isPurchased) {
      return res.status(400).json({
        error: 'Already purchased',
        message: 'This item has already been marked as purchased',
      });
    }

    // Mark as purchased
    const updatedItem = await prisma.giftItem.update({
      where: {
        itemId: itemId,
      },
      data: {
        isPurchased: true,
        purchasedBy: membership.groupMemberId,
        purchasedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      item: updatedItem,
      message: 'Item marked as purchased successfully',
    });
  } catch (error) {
    console.error('Mark item as purchased error:', error);
    res.status(500).json({
      error: 'Failed to mark item as purchased',
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
  linkPersonalRegistry,
  unlinkPersonalRegistry,
  markItemAsPurchased,
};
