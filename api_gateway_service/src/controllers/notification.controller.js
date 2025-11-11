import { StatusCodes } from 'http-status-codes';
import { process_notification_request } from '../services/notification.service.js';

export const send_notification = async (req, res) => {
  const { user_id, template_name, variables } = req.body;

  if (!user_id || !template_name || !variables) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'user_id, template_name, and variables are required',
    });
  }

  // Respond immediately to the client (202 Accepted)
  res.status(StatusCodes.ACCEPTED).json({
    success: true,
    message: 'Notification request accepted and is being processed.',
  });

  // Process the notification asynchronously (fire and forget)
  // Handle errors separately since we've already sent the response
  process_notification_request(req.body).catch((error) => {
    console.error('Error processing notification request (async):', error.message);
    console.error('Stack trace:', error.stack);
    // In a production system, you might want to publish failed requests to a dead-letter queue
  });
};