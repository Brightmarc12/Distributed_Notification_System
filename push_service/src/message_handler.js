import { send_push_notification } from './fcm_client.js';

// Note: No Mustache needed here unless you add variables to the title
// For simplicity, we assume title and body are pre-rendered or simple.

/**
 * Processes a raw push notification message from RabbitMQ.
 * @param {object} messageData - The parsed message data.
 */
export const handle_message = async (messageData) => {
  const { correlation_id, token, title, body } = messageData;
  console.log(`[${correlation_id}] Received push task for token ${token}`);
  
  // The send_push_notification function will throw on failure
  await send_push_notification(token, title, body);

  console.log(`[${correlation_id}] Push notification processed and sent successfully.`);
};