import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type { UserPreferences, CallRecord, JournalEntry } from '@/types';

// Configure DynamoDB client based on environment
const isLocal = process.env.DYNAMODB_ENDPOINT !== undefined;

const dynamoClient = new DynamoDBClient(
  isLocal
    ? {
        endpoint: process.env.DYNAMODB_ENDPOINT,
        region: 'local',
        credentials: {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        },
      }
    : {
        region: process.env.AWS_REGION || 'us-east-1',
      }
);

export const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Table names from environment variables
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'voice-journal-dev-users';
const CALLS_TABLE = process.env.DYNAMODB_CALLS_TABLE || 'voice-journal-dev-calls';
const ENTRIES_TABLE = process.env.DYNAMODB_ENTRIES_TABLE || 'voice-journal-dev-entries';

// User Preferences Operations
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    })
  );
  return (result.Item as UserPreferences) || null;
}

export async function saveUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  const now = new Date().toISOString();
  const existingPrefs = await getUserPreferences(userId);

  const updatedPreferences: UserPreferences = {
    userId,
    phoneNumber: preferences.phoneNumber || existingPrefs?.phoneNumber || '',
    preferredCallTime: preferences.preferredCallTime || existingPrefs?.preferredCallTime || '',
    timezone: preferences.timezone || existingPrefs?.timezone || 'America/New_York',
    scheduleArn: preferences.scheduleArn || existingPrefs?.scheduleArn,
    isActive: preferences.isActive ?? existingPrefs?.isActive ?? true,
    createdAt: existingPrefs?.createdAt || now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: USERS_TABLE,
      Item: updatedPreferences,
    })
  );

  return updatedPreferences;
}

export async function updateScheduleArn(userId: string, scheduleArn: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET scheduleArn = :arn, updatedAt = :now',
      ExpressionAttributeValues: {
        ':arn': scheduleArn,
        ':now': new Date().toISOString(),
      },
    })
  );
}

// Call Record Operations
export async function createCallRecord(call: Omit<CallRecord, 'timestamp'>): Promise<CallRecord> {
  const record: CallRecord = {
    ...call,
    timestamp: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: CALLS_TABLE,
      Item: record,
    })
  );

  return record;
}

export async function updateCallRecord(
  callControlId: string,
  updates: Partial<CallRecord>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  const expressionAttributeNames: Record<string, string> = {};

  if (updates.status !== undefined) {
    updateExpressions.push('#status = :status');
    expressionAttributeValues[':status'] = updates.status;
    expressionAttributeNames['#status'] = 'status';
  }
  if (updates.duration !== undefined) {
    updateExpressions.push('duration = :duration');
    expressionAttributeValues[':duration'] = updates.duration;
  }
  if (updates.recordingUrl !== undefined) {
    updateExpressions.push('recordingUrl = :recordingUrl');
    expressionAttributeValues[':recordingUrl'] = updates.recordingUrl;
  }
  if (updates.recordingId !== undefined) {
    updateExpressions.push('recordingId = :recordingId');
    expressionAttributeValues[':recordingId'] = updates.recordingId;
  }

  if (updateExpressions.length > 0) {
    await docClient.send(
      new UpdateCommand({
        TableName: CALLS_TABLE,
        Key: { callControlId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      })
    );
  }
}

export async function getCallRecord(callControlId: string): Promise<CallRecord | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: CALLS_TABLE,
      Key: { callControlId },
    })
  );
  return (result.Item as CallRecord) || null;
}

export async function getCallsByUser(
  userId: string,
  limit = 20,
  lastKey?: Record<string, unknown>
): Promise<{ calls: CallRecord[]; nextKey?: Record<string, unknown> }> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: CALLS_TABLE,
      IndexName: 'userId-timestamp-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
      ExclusiveStartKey: lastKey,
    })
  );

  return {
    calls: (result.Items as CallRecord[]) || [],
    nextKey: result.LastEvaluatedKey,
  };
}

// Journal Entry Operations
export async function createJournalEntry(
  entry: Omit<JournalEntry, 'entryId' | 'createdAt'>
): Promise<JournalEntry> {
  const journalEntry: JournalEntry = {
    entryId: uuidv4(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  await docClient.send(
    new PutCommand({
      TableName: ENTRIES_TABLE,
      Item: journalEntry,
    })
  );

  return journalEntry;
}

export async function getJournalEntry(entryId: string): Promise<JournalEntry | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: ENTRIES_TABLE,
      Key: { entryId },
    })
  );
  return (result.Item as JournalEntry) || null;
}

export async function getJournalEntriesByUser(
  userId: string,
  limit = 20,
  lastKey?: Record<string, unknown>
): Promise<{ entries: JournalEntry[]; nextKey?: Record<string, unknown> }> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: ENTRIES_TABLE,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
      ExclusiveStartKey: lastKey,
    })
  );

  return {
    entries: (result.Items as JournalEntry[]) || [],
    nextKey: result.LastEvaluatedKey,
  };
}

// Lookup user by phone number (for inbound calls)
export async function getUserByPhoneNumber(phoneNumber: string): Promise<UserPreferences | null> {
  // Note: This requires a scan since phone is not a key.
  // For production at scale, consider adding a GSI on phoneNumber
  const result = await docClient.send(
    new ScanCommand({
      TableName: USERS_TABLE,
      FilterExpression: 'phoneNumber = :phone',
      ExpressionAttributeValues: {
        ':phone': phoneNumber,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  return result.Items[0] as UserPreferences;
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: ENTRIES_TABLE,
      Key: { entryId },
    })
  );
}
