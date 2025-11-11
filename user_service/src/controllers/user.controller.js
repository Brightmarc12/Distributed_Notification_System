import { StatusCodes } from 'http-status-codes';
import {
  create_new_user,
  get_user_by_id,
  get_all_users,
  update_user,
  delete_user,
  update_notification_preferences,
  add_push_token,
  delete_push_token
} from '../services/user.service.js';


export const create_user = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Email and password are required',
    });
  }

  try {
    const newUser = await create_new_user(req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'User created successfully',
      data: newUser,
    });
  } catch (error) {
    // Handle specific Prisma error for unique constraint violation (e.g., email already exists)
    if (error.code === 'P2002') {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    // Generic server error
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

export const get_user = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await get_user_by_id(userId);

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: `User with id [${userId}] not found`,
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

export const list_users = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
      });
    }

    const result = await get_all_users(page, limit);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result.users,
      meta: result.meta,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

export const update_user_info = async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;

    const user = await update_user(userId, updateData);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    if (error.code === 'P2002') {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'Email already exists',
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

export const remove_user = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await delete_user(userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'User deleted successfully',
      data: user,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

export const update_preferences = async (req, res) => {
  try {
    const userId = req.params.id;
    const { email_enabled, push_enabled } = req.body;

    const preferences = await update_notification_preferences(userId, {
      email_enabled,
      push_enabled,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: preferences,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

export const create_push_token = async (req, res) => {
  try {
    const userId = req.params.id;
    const { token, device_type, device_name } = req.body;

    if (!token || !device_type) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Token and device_type are required',
      });
    }

    const pushToken = await add_push_token(userId, {
      token,
      device_type,
      device_name,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Push token added successfully',
      data: pushToken,
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    if (error.code === 'P2002') {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: 'This push token already exists',
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

export const remove_push_token = async (req, res) => {
  try {
    const userId = req.params.id;
    const tokenId = req.params.token_id;

    const deletedToken = await delete_push_token(userId, tokenId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Push token deleted successfully',
      data: deletedToken,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: error.message,
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};