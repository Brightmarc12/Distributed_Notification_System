/**
 * @swagger
 * /api/v1/templates:
 *   post:
 *     summary: Create a new template
 *     description: Creates a new template with version 1
 *     tags:
 *       - Templates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTemplateRequest'
 *           examples:
 *             email_template:
 *               summary: Email template
 *               value:
 *                 name: "welcome-email"
 *                 type: "EMAIL"
 *                 subject: "Welcome to MyApp!"
 *                 body: "Hello {{first_name}}, welcome to our platform!"
 *                 language: "en"
 *             push_template:
 *               summary: Push notification template
 *               value:
 *                 name: "order-shipped"
 *                 type: "PUSH"
 *                 subject: "Your order has shipped!"
 *                 body: "Order #{{order_id}} is on its way!"
 *                 language: "en"
 *     responses:
 *       201:
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   get:
 *     summary: List all templates
 *     description: Returns a paginated list of templates with their active versions
 *     tags:
 *       - Templates
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Template'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 * 
 * /api/v1/templates/{id}:
 *   get:
 *     summary: Get template by ID
 *     description: Returns a template with all its versions
 *     tags:
 *       - Templates
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Template'
 *       404:
 *         description: Template not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update template
 *     description: Creates a new version of the template and deactivates the previous one
 *     tags:
 *       - Templates
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTemplateRequest'
 *     responses:
 *       200:
 *         description: Template updated (new version created)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Template not found
 *   delete:
 *     summary: Delete a template
 *     description: Deletes a template and all its versions (cascade delete)
 *     tags:
 *       - Templates
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 * 
 * /api/v1/templates/name/{name}:
 *   get:
 *     summary: Get template by name
 *     description: Returns the active version of a template by its name (cached for 10 minutes)
 *     tags:
 *       - Templates
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Template name
 *         example: "welcome-email"
 *     responses:
 *       200:
 *         description: Template found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/TemplateVersion'
 *       404:
 *         description: Template not found or no active version
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/v1/templates/{id}/versions:
 *   get:
 *     summary: Get all versions of a template
 *     description: Returns all versions of a template, ordered by version number (descending)
 *     tags:
 *       - Templates
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Template ID
 *     responses:
 *       200:
 *         description: List of template versions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TemplateVersion'
 *       404:
 *         description: Template not found
 */

// This file only contains Swagger documentation
// The actual routes are defined in template.routes.js
export default {};

