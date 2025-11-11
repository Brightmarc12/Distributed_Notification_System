import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL;
let connection = null;
let channel = null;

// Exchange and Queue names
const EXCHANGE_NAME = 'notifications.direct';
const DLX_NAME = 'notifications.dlx'; // Dead-Letter Exchange
const EMAIL_QUEUE = 'email.queue';
const PUSH_QUEUE = 'push.queue';
const FAILED_QUEUE = 'failed.queue'; // Dead-letter queue

export const connect_rabbitmq = async () => {
  try {
    if (!RABBITMQ_URL) {
      throw new Error('RABBITMQ_URL environment variable is not set');
    }
    
    console.log(`Connecting to RabbitMQ at: ${RABBITMQ_URL.replace(/:[^:@]+@/, ':****@')}`); // Hide password in logs
    
    // Connect with heartbeat to keep connection alive and client properties
    const options = {
      heartbeat: 60, // Send heartbeat every 60 seconds
      clientProperties: {
        connection_name: 'api-gateway-service',
      },
    };
    
    connection = await amqp.connect(RABBITMQ_URL, options);
    
    // CRITICAL: Set up error handlers IMMEDIATELY after connection
    // This must happen before any other operations to catch early errors
    connection.on('error', (err) => {
      // Only log if it's not an expected close
      const errMsg = err?.message || String(err);
      if (!errMsg.includes('Connection closing') && 
          !errMsg.includes('Socket was closed')) {
        console.error('RabbitMQ connection error:', errMsg);
      }
      channel = null;
    });
    
    connection.on('close', () => {
      console.warn('RabbitMQ connection closed');
      channel = null;
      connection = null;
    });
    
    // Small delay to ensure connection is stable
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create channel with error handling
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
    
    console.log('✓ Connected to RabbitMQ');

    // --- Assert Topology ---
    // Step 1: Create the Dead-Letter Exchange (DLX)
    console.log(`Creating/Verifying Dead-Letter Exchange: ${DLX_NAME}`);
    await channel.assertExchange(DLX_NAME, 'direct', { durable: true });
    console.log(`✓ Dead-Letter Exchange ${DLX_NAME} ready`);

    // Step 2: Create the main exchange
    console.log(`Creating/Verifying exchange: ${EXCHANGE_NAME}`);
    await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
    console.log(`✓ Exchange ${EXCHANGE_NAME} ready`);

    // Step 3: Create the failed queue and bind it to DLX
    console.log(`Creating/Verifying Dead-Letter Queue: ${FAILED_QUEUE}`);
    await channel.assertQueue(FAILED_QUEUE, { 
      durable: true,
      // Bind the failed queue to the DLX with the queue name as routing key
      arguments: {}
    });
    // Bind failed.queue to DLX
    await channel.bindQueue(FAILED_QUEUE, DLX_NAME, FAILED_QUEUE);
    console.log(`✓ Queue ${FAILED_QUEUE} ready and bound to ${DLX_NAME}`);

    // Step 4: Create email.queue with Dead-Letter Exchange configuration
    // First, try to delete the existing queue if it exists (to recreate with DLX config)
    // RabbitMQ doesn't allow changing queue arguments, so we need to delete and recreate
    try {
      console.log(`Checking if ${EMAIL_QUEUE} needs to be recreated with DLX configuration...`);
      // Try to delete the queue (will fail if it doesn't exist, which is fine)
      await channel.deleteQueue(EMAIL_QUEUE);
      console.log(`⚠️  Deleted existing ${EMAIL_QUEUE} to recreate with DLX configuration`);
      console.log(`   (Note: Any messages in the queue were deleted)`);
    } catch (error) {
      // Queue doesn't exist (404) or is in use - that's fine, we'll try to create it
      if (error.code === 404) {
        // Queue doesn't exist, which is fine - we'll create it
        console.log(`   Queue ${EMAIL_QUEUE} doesn't exist yet, will create it`);
      } else {
        // Some other error - log it but continue
        console.warn(`   Warning: Could not delete queue: ${error.message}`);
        console.warn(`   Will attempt to create/assert queue anyway`);
      }
    }
    
    console.log(`Creating/Verifying queue: ${EMAIL_QUEUE} with DLX configuration`);
    await channel.assertQueue(EMAIL_QUEUE, {
      durable: true,
      // Configure Dead-Letter Exchange
      arguments: {
        'x-dead-letter-exchange': DLX_NAME, // When message is rejected, send to DLX
        'x-dead-letter-routing-key': FAILED_QUEUE, // Route to failed.queue
      }
    });
    console.log(`✓ Queue ${EMAIL_QUEUE} ready with DLX: ${DLX_NAME} -> ${FAILED_QUEUE}`);
    
    // Step 5: Create push.queue with Dead-Letter Exchange configuration
    // First, try to delete the existing queue if it exists (to recreate with DLX config)
    try {
      console.log(`Checking if ${PUSH_QUEUE} needs to be recreated with DLX configuration...`);
      await channel.deleteQueue(PUSH_QUEUE);
      console.log(`⚠️  Deleted existing ${PUSH_QUEUE} to recreate with DLX configuration`);
      console.log(`   (Note: Any messages in the queue were deleted)`);
    } catch (error) {
      if (error.code === 404) {
        console.log(`   Queue ${PUSH_QUEUE} doesn't exist yet, will create it`);
      } else {
        console.warn(`   Warning: Could not delete queue: ${error.message}`);
        console.warn(`   Will attempt to create/assert queue anyway`);
      }
    }
    
    console.log(`Creating/Verifying queue: ${PUSH_QUEUE} with DLX configuration`);
    await channel.assertQueue(PUSH_QUEUE, {
      durable: true,
      // Configure Dead-Letter Exchange
      arguments: {
        'x-dead-letter-exchange': DLX_NAME, // When message is rejected, send to DLX
        'x-dead-letter-routing-key': PUSH_QUEUE, // Route with its own name
      }
    });
    console.log(`✓ Queue ${PUSH_QUEUE} ready with DLX: ${DLX_NAME} -> ${PUSH_QUEUE}`);

    // Step 6: Bind the queues to the main exchange with their routing keys
    console.log(`Binding queues to exchange...`);
    await channel.bindQueue(EMAIL_QUEUE, EXCHANGE_NAME, EMAIL_QUEUE);
    console.log(`✓ Queue ${EMAIL_QUEUE} bound to ${EXCHANGE_NAME} with routing key ${EMAIL_QUEUE}`);
    
    await channel.bindQueue(PUSH_QUEUE, EXCHANGE_NAME, PUSH_QUEUE);
    console.log(`✓ Queue ${PUSH_QUEUE} bound to ${EXCHANGE_NAME} with routing key ${PUSH_QUEUE}`);

    // Step 7: Bind failed.queue to DLX for push queue routing
    // This allows failed push messages to be routed to the failed queue
    await channel.bindQueue(FAILED_QUEUE, DLX_NAME, PUSH_QUEUE);
    console.log(`✓ Queue ${FAILED_QUEUE} bound to ${DLX_NAME} with routing key ${PUSH_QUEUE}`);

    console.log('✓ RabbitMQ topology setup complete');
    console.log(`  - Main Exchange: ${EXCHANGE_NAME}`);
    console.log(`  - Dead-Letter Exchange: ${DLX_NAME}`);
    console.log(`  - Email Queue: ${EMAIL_QUEUE} -> DLX: ${DLX_NAME} -> ${FAILED_QUEUE}`);
    console.log(`  - Push Queue: ${PUSH_QUEUE} -> DLX: ${DLX_NAME} -> ${FAILED_QUEUE}`);

  } catch (error) {
    console.error('✗ Failed to connect to RabbitMQ:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    console.error('Full error:', error);
    // Don't exit immediately - let the process handle it
    throw error;
  }
};

export const get_channel = () => {
  if (!channel) {
    throw new Error('RabbitMQ channel is not available. Connect first.');
  }
  // Check if connection is still open
  if (!connection) {
    throw new Error('RabbitMQ connection is not available. Please reconnect.');
  }
  return channel;
};

// Graceful shutdown
export const close_rabbitmq = async () => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log('RabbitMQ connection closed gracefully');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error.message);
  }
};