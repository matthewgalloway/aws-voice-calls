import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  KeyType,
  ScalarAttributeType,
  ProjectionType,
  BillingMode,
  type CreateTableCommandInput,
} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'local',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const TABLES: Record<string, CreateTableCommandInput> = {
  users: {
    TableName: 'voice-journal-dev-users',
    KeySchema: [{ AttributeName: 'userId', KeyType: KeyType.HASH }],
    AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: ScalarAttributeType.S }],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  calls: {
    TableName: 'voice-journal-dev-calls',
    KeySchema: [{ AttributeName: 'callControlId', KeyType: KeyType.HASH }],
    AttributeDefinitions: [
      { AttributeName: 'callControlId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'userId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'timestamp', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-timestamp-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: KeyType.HASH },
          { AttributeName: 'timestamp', KeyType: KeyType.RANGE },
        ],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
  entries: {
    TableName: 'voice-journal-dev-entries',
    KeySchema: [{ AttributeName: 'entryId', KeyType: KeyType.HASH }],
    AttributeDefinitions: [
      { AttributeName: 'entryId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'userId', AttributeType: ScalarAttributeType.S },
      { AttributeName: 'createdAt', AttributeType: ScalarAttributeType.S },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-createdAt-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: KeyType.HASH },
          { AttributeName: 'createdAt', KeyType: KeyType.RANGE },
        ],
        Projection: { ProjectionType: ProjectionType.ALL },
      },
    ],
    BillingMode: BillingMode.PAY_PER_REQUEST,
  },
};

async function waitForTable(tableName: string): Promise<void> {
  let ready = false;
  while (!ready) {
    const result = await client.send(
      new DescribeTableCommand({ TableName: tableName })
    );
    ready = result.Table?.TableStatus === 'ACTIVE';
    if (!ready) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

async function deleteTableIfExists(tableName: string): Promise<void> {
  try {
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    console.log(`  Deleted existing table: ${tableName}`);
    // Wait a bit for deletion to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    // Table doesn't exist, that's fine
    if ((error as Error).name !== 'ResourceNotFoundException') {
      throw error;
    }
  }
}

async function setupTables(reset = false): Promise<void> {
  console.log('Setting up local DynamoDB tables...\n');

  // Check existing tables
  const existingTables = await client.send(new ListTablesCommand({}));
  console.log('Existing tables:', existingTables.TableNames || []);

  for (const [name, tableConfig] of Object.entries(TABLES)) {
    const tableName = tableConfig.TableName!;
    const exists = existingTables.TableNames?.includes(tableName);

    if (exists && reset) {
      console.log(`\nResetting table: ${name}`);
      await deleteTableIfExists(tableName);
    } else if (exists) {
      console.log(`\nTable already exists: ${tableName} (skipping)`);
      continue;
    }

    console.log(`\nCreating table: ${tableName}`);
    try {
      await client.send(new CreateTableCommand(tableConfig));
      await waitForTable(tableName);
      console.log(`  Created table: ${tableName}`);
    } catch (error) {
      if ((error as Error).name === 'ResourceInUseException') {
        console.log(`  Table already exists: ${tableName}`);
      } else {
        throw error;
      }
    }
  }

  console.log('\n✓ All tables ready!\n');
  console.log('Table names for .env.local:');
  console.log('  DYNAMODB_USERS_TABLE=voice-journal-dev-users');
  console.log('  DYNAMODB_CALLS_TABLE=voice-journal-dev-calls');
  console.log('  DYNAMODB_ENTRIES_TABLE=voice-journal-dev-entries');
  console.log('  DYNAMODB_ENDPOINT=http://localhost:8000');
}

// Parse args
const args = process.argv.slice(2);
const reset = args.includes('--reset');

if (reset) {
  console.log('Running with --reset flag: will recreate all tables\n');
}

setupTables(reset).catch((error) => {
  console.error('Failed to setup tables:', error);
  process.exit(1);
});
