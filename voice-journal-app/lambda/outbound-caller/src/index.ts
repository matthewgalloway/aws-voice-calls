import { ScheduledEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import Telnyx from 'telnyx';

// Environment variables
const TELNYX_SECRET_ARN = process.env.TELNYX_SECRET_ARN!;
const TELNYX_PHONE_NUMBER = process.env.TELNYX_PHONE_NUMBER!;
const TELNYX_CONNECTION_ID = process.env.TELNYX_CONNECTION_ID!;
const APP_URL = process.env.APP_URL!;
const USERS_TABLE = process.env.USERS_TABLE!;
const CALLS_TABLE = process.env.CALLS_TABLE!;

// AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({});

// Cached Telnyx API key
let telnyxApiKey: string | null = null;

interface ScheduledCallEvent {
  userId: string;
  phoneNumber: string;
}

interface UserPreferences {
  userId: string;
  phoneNumber: string;
  preferredCallTime: string;
  timezone: string;
  isActive: boolean;
}

async function getTelnyxApiKey(): Promise<string> {
  if (telnyxApiKey) {
    return telnyxApiKey;
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: TELNYX_SECRET_ARN,
    })
  );

  if (!response.SecretString) {
    throw new Error('Failed to retrieve Telnyx API key');
  }

  const secret = JSON.parse(response.SecretString);
  telnyxApiKey = secret.apiKey;
  return telnyxApiKey!;
}

async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    })
  );

  return (result.Item as UserPreferences) || null;
}

async function createCallRecord(
  callControlId: string,
  userId: string,
  fromNumber: string,
  toNumber: string
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: CALLS_TABLE,
      Item: {
        callControlId,
        userId,
        timestamp: new Date().toISOString(),
        direction: 'outbound',
        status: 'initiated',
        fromNumber,
        toNumber,
      },
    })
  );
}

export async function handler(event: ScheduledEvent | ScheduledCallEvent, context: Context): Promise<void> {
  console.log('Outbound caller invoked:', JSON.stringify(event));

  // Extract userId and phoneNumber from event
  let userId: string;
  let phoneNumber: string;

  if ('userId' in event && 'phoneNumber' in event) {
    // Direct invocation or EventBridge Scheduler payload
    userId = event.userId;
    phoneNumber = event.phoneNumber;
  } else {
    console.error('Invalid event format:', event);
    throw new Error('Invalid event format - missing userId and phoneNumber');
  }

  console.log(`Processing outbound call for user: ${userId}`);

  // Verify user is still active
  const user = await getUserPreferences(userId);

  if (!user) {
    console.log(`User not found: ${userId}`);
    return;
  }

  if (!user.isActive) {
    console.log(`User is inactive: ${userId}`);
    return;
  }

  // Verify phone number matches
  if (user.phoneNumber !== phoneNumber) {
    console.log(`Phone number mismatch for user ${userId}. Using current: ${user.phoneNumber}`);
    phoneNumber = user.phoneNumber;
  }

  // Get Telnyx API key and initialize client
  const apiKey = await getTelnyxApiKey();
  const telnyx = new Telnyx({ apiKey });

  try {
    // Encode userId in client_state for the webhook to retrieve
    const clientState = Buffer.from(userId).toString('base64');

    // Initiate the outbound call using v5 SDK dial method
    const call = await telnyx.calls.dial({
      connection_id: TELNYX_CONNECTION_ID,
      to: phoneNumber,
      from: TELNYX_PHONE_NUMBER,
      webhook_url: `${APP_URL}/api/telnyx/voice?direction=outbound&userId=${encodeURIComponent(userId)}`,
      webhook_url_method: 'POST',
      client_state: clientState,
      answering_machine_detection: 'detect',
    });

    const callControlId = call.data?.call_control_id;
    if (!callControlId) {
      throw new Error('No call_control_id returned from Telnyx');
    }
    console.log(`Call initiated: ${callControlId}`);

    // Record the call in DynamoDB
    await createCallRecord(callControlId, userId, TELNYX_PHONE_NUMBER, phoneNumber);

    console.log(`Call record created for: ${callControlId}`);
  } catch (error) {
    console.error('Failed to initiate call:', error);
    throw error;
  }
}
