import prisma from '../utils/prisma.js';
import { cache_get, cache_set, cache_delete, cache_delete_pattern } from '../utils/redis.js';

/**
 * Creates a new template and its initial version in a single transaction.
 * @param {object} templateData - The data for the template and its first version.
 * @returns {object} The newly created template with its first version.
 */
export const create_new_template = async (templateData) => {
  const { name, type, subject, body, language } = templateData;

  // Use a transaction to ensure both records are created or neither are.
  const newTemplate = await prisma.template.create({
    data: {
      name,
      type,
      versions: {
        create: [
          {
            subject,
            body,
            language,
            version: 1,
            is_active: true,
          },
        ],
      },
    },
    include: {
      versions: true, // Include the newly created version in the response
    },
  });

  return newTemplate;
};


/**
 * Finds the single active version of a template by the template's unique name.
 * @param {string} templateName - The unique name of the parent template (e.g., 'welcome-email').
 * @returns {object | null} The active template version object with template info, or null if not found.
 */
export const get_active_template_by_name = async (templateName) => {
    // Try to get from cache first
    const cache_key = `template:name:${templateName}`;
    const cached_template = await cache_get(cache_key);

    if (cached_template) {
      return cached_template;
    }

    // Find the first version that is active and belongs to the template with the given name.
    // Include the parent template to get the type field.
    const templateVersion = await prisma.templateVersion.findFirst({
      where: {
        is_active: true,
        template: {
          name: templateName,
        },
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true, // Include the type from the parent Template
          },
        },
      },
    });

    // If template version found, combine the data for easier use
    if (templateVersion) {
      const result = {
        ...templateVersion,
        type: templateVersion.template.type, // Add type to the root level
      };

      // Cache the template for 10 minutes (templates don't change often)
      await cache_set(cache_key, result, 600);

      return result;
    }

    return null;
  };

/**
 * Get all templates with pagination
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 10)
 * @returns {object} Templates array and pagination metadata
 */
export const get_all_templates = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  // Get total count for pagination
  const total = await prisma.template.count();

  // Get templates with pagination
  const templates = await prisma.template.findMany({
    skip,
    take: limit,
    include: {
      versions: {
        where: {
          is_active: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate pagination metadata
  const total_pages = Math.ceil(total / limit);

  return {
    templates,
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
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {object | null} Template with all versions
 */
export const get_template_by_id = async (templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: {
      versions: {
        orderBy: {
          version: 'desc',
        },
      },
    },
  });

  return template;
};

/**
 * Update template (creates a new version)
 * @param {string} templateId - Template ID
 * @param {object} updateData - New version data
 * @returns {object} Updated template with new version
 */
export const update_template = async (templateId, updateData) => {
  const { subject, body, language = 'en' } = updateData;

  // Get the template to check if it exists
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    include: {
      versions: {
        where: {
          language,
        },
        orderBy: {
          version: 'desc',
        },
        take: 1,
      },
    },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  // Get the next version number
  const nextVersion = template.versions.length > 0 ? template.versions[0].version + 1 : 1;

  // Deactivate all previous versions for this language
  await prisma.templateVersion.updateMany({
    where: {
      template_id: templateId,
      language,
    },
    data: {
      is_active: false,
    },
  });

  // Create new version
  const updatedTemplate = await prisma.template.update({
    where: { id: templateId },
    data: {
      versions: {
        create: {
          subject,
          body,
          language,
          version: nextVersion,
          is_active: true,
        },
      },
    },
    include: {
      versions: {
        where: {
          is_active: true,
        },
      },
    },
  });

  // Invalidate cache for this template
  await cache_delete(`template:name:${template.name}`);
  await cache_delete(`template:id:${templateId}`);

  return updatedTemplate;
};

/**
 * Delete a template
 * @param {string} templateId - Template ID
 * @returns {object} Deleted template
 */
export const delete_template = async (templateId) => {
  // Get template name before deleting for cache invalidation
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  // Prisma will cascade delete all versions
  const deletedTemplate = await prisma.template.delete({
    where: { id: templateId },
  });

  // Invalidate cache
  await cache_delete(`template:name:${template.name}`);
  await cache_delete(`template:id:${templateId}`);

  return deletedTemplate;
};

/**
 * Get all versions of a template
 * @param {string} templateId - Template ID
 * @returns {array} All versions of the template
 */
export const get_template_versions = async (templateId) => {
  const versions = await prisma.templateVersion.findMany({
    where: {
      template_id: templateId,
    },
    orderBy: {
      version: 'desc',
    },
  });

  return versions;
};