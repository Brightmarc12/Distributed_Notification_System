import mustache from 'mustache';
import { send_email } from './email_sender.js';

/**
 * Processes a raw message from RabbitMQ.
 * @param {object} message - The raw message object from amqplib.
 */
export const handle_message = async (message) => {
  // 1. Parse the message content
  const messageData = JSON.parse(message.content.toString());
  const { correlation_id, user, template, variables } = messageData;

  console.log(`[${correlation_id}] Processing email task for user ${user.email}`);

  // 2. Render the template with variables using Mustache
  const renderedSubject = mustache.render(template.subject, { ...user, ...variables });
  const renderedBody = mustache.render(template.body, { ...user, ...variables });

  // 3. Send the email - this will throw an error if it fails
  await send_email(user.email, renderedSubject, renderedBody);

  console.log(`[${correlation_id}] Email processed and sent successfully.`);
  return true; // Indicate success
};