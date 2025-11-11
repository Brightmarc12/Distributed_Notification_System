import amqp from 'amqplib';
import 'dotenv/config';
import http from 'http';
import { handle_message } from './message_handler.js';
import { get_circuit_breaker_stats } from './fcm_client.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const EXCHANGE_NAME = 'notifications.direct';
const PUSH_QUEUE = 'push.queue';
const HEALTH_PORT = process.env.HEALTH_PORT || 3011;

// Retry configuration
const MAX_RETRIES = 4; // Total attempts: initial + 3 retries
// Exponential backoff delays: 1s (first retry), 5s (second retry), 25s (third retry)
// retryCount 0 -> 1s, retryCount 1 -> 5s, retryCount 2 -> 25s
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second for first retry
const BACKOFF_MULTIPLIER = 5; // Multiply by 5 for each subsequent retry

// Start health check HTTP server
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    const stats = get_circuit_breaker_stats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'push_service',
      circuit_breaker: stats,
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

healthServer.listen(HEALTH_PORT, () => {
  console.log(`Health check server running on port ${HEALTH_PORT}`);
});

const start_worker = async () => {
  let connection = null;
  let channel = null;

  try {
    // Validate environment variable
    if (!RABBITMQ_URL) {
      throw new Error(
        'RABBITMQ_URL environment variable is not set.\n' +
        'Please set it in your .env file or environment.\n' +
        'Example: RABBITMQ_URL=amqp://user:password@localhost:5672'
      );
    }

    console.log(`Connecting to RabbitMQ at: ${RABBITMQ_URL.replace(/:[^:@]+@/, ':****@')}`);

    // Connect with heartbeat to keep connection alive
    connection = await amqp.connect(RABBITMQ_URL, {
      heartbeat: 60, // Send heartbeat every 60 seconds
      clientProperties: {
        connection_name: 'push-service-worker',
      },
    });

    // Handle connection errors
    connection.on('error', (err) => {
      const errMsg = err?.message || String(err);
      if (!errMsg.includes('Connection closing') && !errMsg.includes('Socket was closed')) {
        console.error('RabbitMQ connection error:', errMsg);
      }
      channel = null;
    });

    // Handle connection close
    connection.on('close', () => {
      console.warn('RabbitMQ connection closed. Attempting to reconnect...');
      channel = null;
      connection = null;
      // In a production system, you might want to implement reconnection logic here
    });

    // Small delay to ensure connection is stable
    await new Promise(resolve => setTimeout(resolve, 100));

    channel = await connection.createChannel();

    // Handle channel errors
    channel.on('error', (err) => {
      console.error('RabbitMQ channel error:', err.message);
    });

    // Handle channel close
    channel.on('close', () => {
      console.warn('RabbitMQ channel closed');
      channel = null;
    });

    console.log('✓ Worker connected to RabbitMQ');

    // Ensure the queue exists (should match API Gateway configuration)
    // Note: We don't delete/recreate here - the API Gateway handles queue creation
    // We just assert it exists with the correct configuration
    try {
      await channel.assertQueue(PUSH_QUEUE, { 
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'notifications.dlx',
          'x-dead-letter-routing-key': 'push.queue',
        }
      });
      console.log(`✓ Queue ${PUSH_QUEUE} ready`);
    } catch (error) {
      if (error.code === 406) {
        console.error(`\n✗ Queue ${PUSH_QUEUE} exists with incompatible configuration.`);
        console.error(`  Please delete the queue manually in RabbitMQ UI or restart RabbitMQ.`);
        console.error(`  Or ensure API Gateway starts first to recreate the queue.`);
        throw error;
      }
      throw error;
    }

    // Ensure the exchange exists for republishing messages
    await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
    console.log(`✓ Exchange ${EXCHANGE_NAME} ready`);

    // Set prefetch to 1 to ensure this worker only gets one message at a time
    channel.prefetch(1);
    console.log(`[*] Waiting for messages in queue: ${PUSH_QUEUE}. To exit press CTRL+C`);
    console.log(`[*] Retry configuration: Max ${MAX_RETRIES} attempts with exponential backoff`);

    // Consume messages from the queue
    channel.consume(PUSH_QUEUE, async (msg) => {
      if (msg !== null) {
        // Extract correlation ID and retry count outside try-catch for proper scoping
        let correlationId = 'unknown';
        let retryCount = 0;
        let attemptNumber = 1;
        
        try {
          // Parse message to get correlation ID
          const messageData = JSON.parse(msg.content.toString());
          correlationId = messageData.correlation_id || 'unknown';
          
          // Get retry count from message headers (default to 0 for first attempt)
          retryCount = (msg.properties.headers?.['x-retry-count'] || 0);
          attemptNumber = retryCount + 1;
          
          // Log message receipt
          console.log(`\n[${correlationId}] 📨 Message received (Attempt ${attemptNumber}/${MAX_RETRIES})`);
          console.log(`[${correlationId}] 📊 Retry count: ${retryCount}`);
          
          // Process the message
          await handle_message(messageData);
          
          // Success! Acknowledge and remove from queue
          console.log(`[${correlationId}] ✅ Push notification sent successfully!`);
          channel.ack(msg);
          
        } catch (error) {
          // If correlationId wasn't extracted in try block, try to get it now
          if (correlationId === 'unknown') {
            try {
              const messageData = JSON.parse(msg.content.toString());
              correlationId = messageData.correlation_id || 'unknown';
            } catch (e) {
              // Couldn't parse message, try to get from message properties
              correlationId = msg.properties.correlationId || msg.properties.messageId || 'unknown';
            }
          }
          
          // Get retry count if not already set
          if (retryCount === 0 && attemptNumber === 1) {
            retryCount = (msg.properties.headers?.['x-retry-count'] || 0);
            attemptNumber = retryCount + 1;
          }
          
          console.error(`[${correlationId}] ❌ Error processing message (attempt ${attemptNumber}): ${error.message}`);
          
          // Check if we should retry
          if (attemptNumber < MAX_RETRIES) {
            // Calculate exponential backoff delay
            // retryCount 0 (first retry) -> 1s
            // retryCount 1 (second retry) -> 5s  
            // retryCount 2 (third retry) -> 25s
            const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
            const delaySeconds = delayMs / 1000;
            
            console.log(`[${correlationId}] 🔄 Retrying in ${delaySeconds}s... (attempt ${attemptNumber + 1}/${MAX_RETRIES})`);
            
            // Acknowledge the current message to remove it from the queue
            channel.ack(msg);
            
            // Wait for the exponential backoff delay
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            // Republish the message with incremented retry count
            const messageContent = msg.content;
            
            // Preserve existing headers and add retry information
            const existingHeaders = msg.properties.headers || {};
            const newHeaders = {
              ...existingHeaders,
              'x-retry-count': retryCount + 1,
              'x-original-error': error.message.substring(0, 200), // Limit error message length
              'x-retry-timestamp': new Date().toISOString(),
              'x-retry-attempt': attemptNumber + 1,
            };
            
            // Ensure we have correlationId for republishing
            let publishCorrelationId = correlationId;
            if (publishCorrelationId === 'unknown') {
              publishCorrelationId = msg.properties.correlationId || msg.properties.messageId || 'unknown';
            }
            
            const published = channel.publish(
              EXCHANGE_NAME,
              PUSH_QUEUE,
              messageContent,
              {
                persistent: true,
                contentType: msg.properties.contentType || 'application/json',
                messageId: msg.properties.messageId || publishCorrelationId,
                correlationId: publishCorrelationId,
                timestamp: Date.now(),
                headers: newHeaders,
              }
            );
            
            if (published) {
              console.log(`[${correlationId}] 📤 Message republished to queue for retry ${attemptNumber + 1}`);
            } else {
              console.error(`[${correlationId}] ⚠️ Failed to republish message - channel buffer may be full`);
              // If we can't republish, we've already acked, so the message is lost
              // In production, you might want to publish to a separate error queue here
            }
          } else {
            // Max retries reached - reject message to trigger Dead-Letter Queue
            console.error(`[${correlationId}] 🚫 Max retries (${MAX_RETRIES}) reached. Moving to dead-letter queue.`);
            console.error(`[${correlationId}] 📋 Final error: ${error.message}`);
            
            // Reject the message without requeuing - this triggers DLX routing to failed.queue
            channel.nack(msg, false, false);
            console.log(`[${correlationId}] 📮 Message rejected and routed to dead-letter queue (failed.queue)`);
          }
        }
      }
    }, {
      // Manual acknowledgment mode
      noAck: false
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      if (channel) {
        try {
          await channel.close();
        } catch (err) {
          console.error('Error closing channel:', err.message);
        }
      }
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection:', err.message);
        }
      }
      console.log('Push service worker shut down');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('✗ Failed to start worker:', error.message);
    
    // Provide helpful error messages for common issues
    if (error.message.includes('ACCESS_REFUSED')) {
      console.error('\nAuthentication failed. Please check:');
      console.error('1. RABBITMQ_URL is set correctly (format: amqp://username:password@host:port)');
      console.error('2. Username and password match RabbitMQ configuration');
      console.error('3. RabbitMQ is running (docker-compose up)');
      console.error(`\nExpected format: amqp://user:password@localhost:5672`);
      console.error(`Current RABBITMQ_URL: ${RABBITMQ_URL ? RABBITMQ_URL.replace(/:[^:@]+@/, ':****@') : 'NOT SET'}`);
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\nConnection refused. Please check:');
      console.error('1. RabbitMQ is running (docker-compose up)');
      console.error('2. RabbitMQ is accessible on the configured host and port');
    } else if (error.message.includes('not set')) {
      console.error('\nPlease create a .env file in the push_service directory with:');
      console.error('RABBITMQ_URL=amqp://user:password@localhost:5672');
    } else if (error.code === 406) {
      console.error('\nQueue configuration mismatch. Please:');
      console.error('1. Start the API Gateway first to recreate the queue with correct configuration');
      console.error('2. Or delete the push.queue manually in RabbitMQ UI');
    }
    
    process.exit(1);
  }
};

start_worker();