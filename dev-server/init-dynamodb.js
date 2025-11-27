#!/usr/bin/env node
/**
 * Initialize DynamoDB Local tables for FinanceFlow
 * Run from /app/backend in the container
 */

import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://dynamodb-local:8000',
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: { 
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local', 
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local' 
  },
  requestHandler: {
    requestTimeout: 5000, // 5 second timeout
    connectionTimeout: 3000
  }
});

async function initTables() {
  console.log('🔧 Initializing DynamoDB tables...');
  console.log('   Endpoint:', process.env.DYNAMODB_ENDPOINT || 'http://dynamodb-local:8000');
  
  try {
    const tables = await client.send(new ListTablesCommand({}));
    console.log('📋 Existing tables:', tables.TableNames || []);

    // Create Transactions table if not exists
    if (!tables.TableNames?.includes('Transactions')) {
      await client.send(new CreateTableCommand({
        TableName: 'Transactions',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'transactionId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'transactionId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      }));
      console.log('✅ Created Transactions table');
    } else {
      console.log('✔️  Transactions table already exists');
    }

    // Create Categories table if not exists
    if (!tables.TableNames?.includes('Categories')) {
      await client.send(new CreateTableCommand({
        TableName: 'Categories',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'categoryId', KeyType: 'RANGE' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'categoryId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      }));
      console.log('✅ Created Categories table');
    } else {
      console.log('✔️  Categories table already exists');
    }

    // Verify tables
    const finalTables = await client.send(new ListTablesCommand({}));
    console.log('📋 Final tables:', finalTables.TableNames);
    console.log('🎉 DynamoDB initialization complete!');

  } catch (e) {
    console.error('❌ Error initializing tables:', e.message);
    process.exit(1);
  }
}

initTables();
