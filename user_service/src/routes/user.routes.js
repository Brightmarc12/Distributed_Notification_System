import { Router } from 'express';
import {
  create_user,
  get_user,
  list_users,
  update_user_info,
  remove_user,
  update_preferences,
  create_push_token,
  remove_push_token
} from '../controllers/user.controller.js';

const router = Router();

// User CRUD operations
router.post('/', create_user);
router.get('/', list_users);
router.get('/:id', get_user);
router.put('/:id', update_user_info);
router.delete('/:id', remove_user);

// Notification preferences
router.put('/:id/preferences', update_preferences);

// Push tokens
router.post('/:id/push-tokens', create_push_token);
router.delete('/:id/push-tokens/:token_id', remove_push_token);

export default router;