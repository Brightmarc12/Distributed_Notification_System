import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { cache_get, cache_set, cache_delete, cache_delete_pattern } from '../utils/redis.js';

/**
 * Creates a new user and their default notification preferences.
 * @param {object} userData - The user data from the request.
 * @returns {object} The newly created user object, without the password.
 */
export const create_new_user = async (userData) => {
  const { email, password, first_name, last_name } = userData;

  // Hash the password before storing it
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Use a Prisma transaction to ensure both user and preferences are created successfully
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        password_hash,
        first_name,
        last_name,
      },
    });

    // Create default notification preferences for the new user
    await tx.notificationPreference.create({
      data: {
        user_id: newUser.id,
        email_enabled: true, // Default to true
        push_enabled: true,  // Default to true
      },
    });

    return newUser;
  });

  // Don't return the password hash in the response
  delete user.password_hash;
  return user;
};

/**
 * Finds a user by their ID and includes their notification preferences.
 * @param {string} userId - The unique ID of the user.
 * @returns {object | null} The user object with preferences, or null if not found.
 */
export const get_user_by_id = async (userId) => {
  // Try to get from cache first
  const cache_key = `user:${userId}`;
  const cached_user = await cache_get(cache_key);

  if (cached_user) {
    return cached_user;
  }

  // If not in cache, fetch from database
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    // Use the 'include' option to fetch related data in the same query
    include: {
      notification_preference: true, // Include the related notification preference
      push_tokens: true,             // Also include their push tokens
    },
  });

  if (user) {
    // Ensure the password hash is never exposed
    delete user.password_hash;

    // Cache the user data for 5 minutes
    await cache_set(cache_key, user, 300);
  }

  return user;
};

/**
 * Get all users with pagination
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @returns {object} Users array and pagination metadata
 */
export const get_all_users = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  // Get total count for pagination
  const total = await prisma.user.count();

  // Get users with pagination
  const users = await prisma.user.findMany({
    skip,
    take: limit,
    include: {
      notification_preference: true,
      push_tokens: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // Remove password hashes
  users.forEach(user => {
    delete user.password_hash;
  });

  // Calculate pagination metadata
  const total_pages = Math.ceil(total / limit);

  return {
    users,
    meta: {
      total,
      limit,
      page,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
    },
  };
};

/**
 * Update user information
 * @param {string} userId - User ID
 * @param {object} updateData - Data to update
 * @returns {object} Updated user
 */
export const update_user = async (userId, updateData) => {
  const { email, password, first_name, last_name } = updateData;

  const dataToUpdate = {};

  if (email) dataToUpdate.email = email;
  if (first_name !== undefined) dataToUpdate.first_name = first_name;
  if (last_name !== undefined) dataToUpdate.last_name = last_name;

  // If password is being updated, hash it
  if (password) {
    const salt = await bcrypt.genSalt(10);
    dataToUpdate.password_hash = await bcrypt.hash(password, salt);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    include: {
      notification_preference: true,
      push_tokens: true,
    },
  });

  delete user.password_hash;

  // Invalidate cache
  await cache_delete(`user:${userId}`);

  return user;
};

/**
 * Delete a user
 * @param {string} userId - User ID
 * @returns {object} Deleted user
 */
export const delete_user = async (userId) => {
  // Prisma will cascade delete related records (preferences, push_tokens)
  const user = await prisma.user.delete({
    where: { id: userId },
  });

  delete user.password_hash;

  // Invalidate cache
  await cache_delete(`user:${userId}`);

  return user;
};

/**
 * Update user notification preferences
 * @param {string} userId - User ID
 * @param {object} preferences - Notification preferences
 * @returns {object} Updated preferences
 */
export const update_notification_preferences = async (userId, preferences) => {
  const { email_enabled, push_enabled } = preferences;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Update or create preferences
  const updatedPreferences = await prisma.notificationPreference.upsert({
    where: { user_id: userId },
    update: {
      email_enabled: email_enabled !== undefined ? email_enabled : undefined,
      push_enabled: push_enabled !== undefined ? push_enabled : undefined,
    },
    create: {
      user_id: userId,
      email_enabled: email_enabled ?? true,
      push_enabled: push_enabled ?? true,
    },
  });

  // Invalidate user cache since preferences changed
  await cache_delete(`user:${userId}`);

  return updatedPreferences;
};

/**
 * Add a push token for a user
 * @param {string} userId - User ID
 * @param {object} tokenData - Token data (token, device_type, device_name)
 * @returns {object} Created push token
 */
export const add_push_token = async (userId, tokenData) => {
  const { token, device_type, device_name } = tokenData;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Create push token
  const pushToken = await prisma.pushToken.create({
    data: {
      user_id: userId,
      token,
      device_type,
      device_name,
    },
  });

  // Invalidate user cache since push tokens changed
  await cache_delete(`user:${userId}`);

  return pushToken;
};

/**
 * Delete a push token
 * @param {string} userId - User ID
 * @param {string} tokenId - Token ID
 * @returns {object} Deleted token
 */
export const delete_push_token = async (userId, tokenId) => {
  // Verify the token belongs to the user
  const token = await prisma.pushToken.findFirst({
    where: {
      id: tokenId,
      user_id: userId,
    },
  });

  if (!token) {
    throw new Error('Push token not found or does not belong to this user');
  }

  const deletedToken = await prisma.pushToken.delete({
    where: { id: tokenId },
  });

  // Invalidate user cache since push tokens changed
  await cache_delete(`user:${userId}`);

  return deletedToken;
};