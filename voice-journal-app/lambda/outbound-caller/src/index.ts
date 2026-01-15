import { ScheduledEvent, Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import twilio from 'twilio';

// Environment variables
const TWILIO_SECRET_ARN = process.env.TWILIO_SECRET_ARN!;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;
const APP_URL = process.env.APP_URL!;
const USERS_TABLE = process.env.USERS_TABLE!;
const CALLS_TABLE = process.env.CALLS_TABLE!;

// AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({});

// Cached Twilio credentials
let twilioCredentials: { accountSid: string; authToken: string } | null = null;

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

async function getTwilioCredentials(): Promise<{ accountSid: string; authToken: string }> {
  if (twilioCredentials) {
    return twilioCredentials;
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: TWILIO_SECRET_ARN,
    })
  );

  if (!response.SecretString) {
    throw new Error('Failed to retrieve Twilio credentials');
  }

  twilioCredentials = JSON.parse(response.SecretString);
  return twilioCredentials!;
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
  callSid: string,
  userId: string,
  fromNumber: string,
  toNumber: string
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: CALLS_TABLE,
      Item: {
        callSid,
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
  // EventBridge Scheduler passes custom payload
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

  // Verify phone number matches (in case it was updated since schedule was created)
  if (user.phoneNumber !== phoneNumber) {
    console.log(`Phone number mismatch for user ${userId}. Expected: ${user.phoneNumber}, Got: ${phoneNumber}`);
    // Use the current phone number from preferences
    phoneNumber = user.phoneNumber;
  }

  // Get Twilio credentials
  const credentials = await getTwilioCredentials();
  const twilioClient = twilio(credentials.accountSid, credentials.authToken);

  try {
    // Initiate the outbound call
    const call = await twilioClient.calls.create({
      to: phoneNumber,
      from: TWILIO_PHONE_NUMBER,
      url: `${APP_URL}/api/twilio/voice?direction=outbound&userId=${encodeURIComponent(userId)}`,
      statusCallback: `${APP_URL}/api/twilio/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
    });

    console.log(`Call initiated: ${call.sid}`);

    // Record the call in DynamoDB
    await createCallRecord(call.sid, userId, TWILIO_PHONE_NUMBER, phoneNumber);

    console.log(`Call record created for: ${call.sid}`);
  } catch (error) {
    console.error('Failed to initiate call:', error);
    throw error;
  }
}
