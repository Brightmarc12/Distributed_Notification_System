import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { get_channel } from '../utils/rabbitmq.js';
import { userServiceBreaker, templateServiceBreaker } from '../utils/circuit-breaker.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL;
const TEMPLATE_SERVICE_URL = process.env.TEMPLATE_SERVICE_URL;

// Validate environment variables
if (!USER_SERVICE_URL) {
  console.warn('WARNING: USER_SERVICE_URL environment variable is not set');
}
if (!TEMPLATE_SERVICE_URL) {
  console.warn('WARNING: TEMPLATE_SERVICE_URL environment variable is not set');
}

const EXCHANGE_NAME = 'notifications.direct';
const EMAIL_QUEUE = 'email.queue';
const PUSH_QUEUE = 'push.queue';

export const process_notification_request = async (requestData) => {
  const { user_id, template_name, variables } = requestData;
  const correlation_id = uuidv4(); // Unique ID for this entire request flow

  console.log(`[${correlation_id}] Processing notification for user ${user_id} with template ${template_name}`);

  try {
    // 1. Fetch user data (Synchronous REST call with circuit breaker)
    console.log(`[${correlation_id}] Fetching user from: ${USER_SERVICE_URL}/api/v1/users/${user_id}`);
    const userResponse = await userServiceBreaker.fire(`${USER_SERVICE_URL}/api/v1/users/${user_id}`);
    const user = userResponse.data.data;
    if (!user) {
      throw new Error('User not found in response');
    }
    console.log(`[${correlation_id}] User found: ${user.email}`);

    // 2. Fetch template data (Synchronous REST call with circuit breaker)
    console.log(`[${correlation_id}] Fetching template from: ${TEMPLATE_SERVICE_URL}/api/v1/templates/name/${template_name}`);
    const templateResponse = await templateServiceBreaker.fire(`${TEMPLATE_SERVICE_URL}/api/v1/templates/name/${template_name}`);
    const template = templateResponse.data.data;
    if (!template) {
      throw new Error('Template not found in response');
    }
    console.log(`[${correlation_id}] Template found: ${template_name}, type: ${template.type}`);

    // 3. Decision Logic: Check preferences and template type
    if (!user.notification_preference) {
      console.warn(`[${correlation_id}] User has no notification preferences, defaulting to email enabled`);
    }
    
    const emailEnabled = user.notification_preference?.email_enabled !== false; // Default to true if not set
    const pushEnabled = user.notification_preference?.push_enabled !== false; // Default to true if not set
    
    if (template.type === 'EMAIL' && emailEnabled) {
      // 4. Construct and Publish Message to Email Queue
      const message = {
        correlation_id,
        user: {
          email: user.email,
          first_name: user.first_name,
        },
        template: {
          subject: template.subject,
          body: template.body,
        },
        variables, // The variables to be substituted (e.g., { name: 'John' })
      };

      console.log(`[${correlation_id}] Attempting to publish message to RabbitMQ...`);
      const channel = get_channel();
      
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const messageSize = messageBuffer.length;
      
      // Publish message to the exchange with the email queue's name as the routing key
      const published = channel.publish(
        EXCHANGE_NAME, 
        EMAIL_QUEUE, 
        messageBuffer, 
        { 
          persistent: true,
          contentType: 'application/json',
          messageId: correlation_id,
          correlationId: correlation_id, // Preserve correlation ID in message properties
          timestamp: Date.now(),
          headers: {
            'x-retry-count': 0, // Initialize retry count
          },
        }
      );
      
      if (!published) {
        console.error(`[${correlation_id}] WARNING: Message may not have been published (channel buffer full?)`);
        // In production, you might want to retry or use publisher confirms
      } else {
        const publishedAt = new Date().toISOString();
        console.log(`[${correlation_id}] ✅ Message published at ${publishedAt}`);
        console.log(`[${correlation_id}] 📤 Exchange: ${EXCHANGE_NAME}, Routing Key: ${EMAIL_QUEUE}, Size: ${messageSize} bytes`);
        console.log(`[${correlation_id}] 📋 Message will be delivered to queue: ${EMAIL_QUEUE}`);
      }
      
      console.log(`[${correlation_id}] Message payload:`, JSON.stringify(message, null, 2));
      
      return { success: true, message: 'Email notification queued successfully.' };
    } else if (template.type === 'PUSH' && pushEnabled) {
      // 4. Handle Push Notification
      if (!user.push_tokens || user.push_tokens.length === 0) {
        console.log(`[${correlation_id}] User has no push tokens. Skipping.`);
        return { success: true, message: 'User has no push tokens; request skipped.' };
      }

      console.log(`[${correlation_id}] User has ${user.push_tokens.length} push token(s). Publishing messages...`);
      const channel = get_channel();
      
      let publishedCount = 0;
      // A user can have multiple devices. Send a notification to each one.
      for (const pushToken of user.push_tokens) {
        const message = {
          correlation_id,
          token: pushToken.token,
          title: template.subject, // Using 'subject' for title
          body: template.body,
          variables,
        };

        const messageBuffer = Buffer.from(JSON.stringify(message));
        const messageSize = messageBuffer.length;
        
        const published = channel.publish(
          EXCHANGE_NAME, 
          PUSH_QUEUE, 
          messageBuffer, 
          { 
            persistent: true,
            contentType: 'application/json',
            messageId: `${correlation_id}-${pushToken.token.substring(0, 8)}`, // Unique message ID per token
            correlationId: correlation_id,
            timestamp: Date.now(),
            headers: {
              'x-retry-count': 0, // Initialize retry count
            },
          }
        );
        
        if (published) {
          publishedCount++;
          console.log(`[${correlation_id}] 📤 Message published to push queue for token ${pushToken.token.substring(0, 20)}... (Size: ${messageSize} bytes)`);
        } else {
          console.error(`[${correlation_id}] ⚠️ Failed to publish message for token ${pushToken.token.substring(0, 20)}...`);
        }
      }

      if (publishedCount > 0) {
        console.log(`[${correlation_id}] ✅ ${publishedCount} push notification(s) queued successfully.`);
        return { success: true, message: `Push notifications queued successfully (${publishedCount} device(s)).` };
      } else {
        throw new Error('Failed to publish any push notification messages');
      }
    }

    console.log(`[${correlation_id}] Notification not queued. Template type: ${template.type}, Email enabled: ${emailEnabled}, Push enabled: ${pushEnabled}`);
    return { success: false, message: 'Notification type not enabled or not supported.' };
  } catch (error) {
    console.error(`[${correlation_id}] Error in process_notification_request:`, error.message);
    if (error.response) {
      console.error(`[${correlation_id}] HTTP Error Status: ${error.response.status}`);
      console.error(`[${correlation_id}] HTTP Error Data:`, error.response.data);
    }
    throw error; // Re-throw so the caller can handle it
  }
};