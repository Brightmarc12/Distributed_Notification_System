import { Router } from 'express';
import {
  create_template,
  get_template,
  list_templates,
  get_template_by_id_controller,
  update_template_controller,
  delete_template_controller,
  get_versions
} from '../controllers/template.controller.js';

const router = Router();

// Template CRUD operations
router.post('/', create_template);
router.get('/', list_templates);
router.get('/name/:name', get_template); // Get by name (active version)
router.get('/:id', get_template_by_id_controller); // Get by ID (all versions)
router.put('/:id', update_template_controller);
router.delete('/:id', delete_template_controller);

// Version history
router.get('/:id/versions', get_versions);

export default router;