import { StatusCodes } from 'http-status-codes';
import {
  create_new_template,
  get_active_template_by_name,
  get_all_templates,
  get_template_by_id,
  update_template,
  delete_template,
  get_template_versions
} from '../services/template.service.js';

export const create_template = async (req, res) => {
  try {
    const newTemplate = await create_new_template(req.body);
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Template created successfully',
      data: newTemplate,
    });
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint failed (template name exists)
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: `A template with the name [${req.body.name}] already exists`,
      });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

export const get_template = async (req, res) => {
  try {
    const templateName = req.params.name;
    const template = await get_active_template_by_name(templateName);

    if (!template) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: `Active template with name [${templateName}] not found`,
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Template retrieved successfully',
      data: template,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/**
 * List all templates with pagination
 */
export const list_templates = async (req, res) => {
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

    const result = await get_all_templates(page, limit);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Templates retrieved successfully',
      data: result.templates,
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

/**
 * Get template by ID
 */
export const get_template_by_id_controller = async (req, res) => {
  try {
    const templateId = req.params.id;
    const template = await get_template_by_id(templateId);

    if (!template) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: `Template with ID [${templateId}] not found`,
      });
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Template retrieved successfully',
      data: template,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

/**
 * Update template (creates new version)
 */
export const update_template_controller = async (req, res) => {
  try {
    const templateId = req.params.id;
    const updatedTemplate = await update_template(templateId, req.body);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Template updated successfully (new version created)',
      data: updatedTemplate,
    });
  } catch (error) {
    if (error.message === 'Template not found') {
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

/**
 * Delete template
 */
export const delete_template_controller = async (req, res) => {
  try {
    const templateId = req.params.id;
    await delete_template(templateId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') { // Record not found
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Template not found',
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};

/**
 * Get all versions of a template
 */
export const get_versions = async (req, res) => {
  try {
    const templateId = req.params.id;
    const versions = await get_template_versions(templateId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Template versions retrieved successfully',
      data: versions,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Something went wrong on the server',
      error: error.message,
    });
  }
};