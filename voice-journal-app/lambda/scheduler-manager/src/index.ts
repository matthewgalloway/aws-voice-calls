import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
  GetScheduleCommand,
  ResourceNotFoundException,
  FlexibleTimeWindowMode,
} from '@aws-sdk/client-scheduler';

// Environment variables
const OUTBOUND_CALLER_ARN = process.env.OUTBOUND_CALLER_ARN!;
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN!;
const USERS_TABLE = process.env.USERS_TABLE!;
const SCHEDULE_GROUP = process.env.SCHEDULE_GROUP || 'voice-journal-user-calls';

// AWS clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const schedulerClient = new SchedulerClient({});

type ScheduleAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface ScheduleEvent {
  action: ScheduleAction;
  userId: string;
  phoneNumber?: string;
  preferredCallTime?: string; // HH:MM format
  timezone?: string; // IANA timezone
}

// Timezone offset data (simplified - in production use a library like date-fns-tz)
const TIMEZONE_OFFSETS: Record<string, number> = {
  'America/New_York': -5,
  'America/Chicago': -6,
  'America/Denver': -7,
  'America/Los_Angeles': -8,
  'America/Anchorage': -9,
  'Pacific/Honolulu': -10,
  'Europe/London': 0,
  'Europe/Paris': 1,
  'Asia/Tokyo': 9,
  'Australia/Sydney': 11,
};

function getScheduleName(userId: string): string {
  // Create a valid schedule name from userId
  // EventBridge Schedule names must match: [\.\-_A-Za-z0-9]+
  return `user-call-${userId.replace(/[^A-Za-z0-9]/g, '-')}`;
}

function convertToCronExpression(time: string, timezone: string): string {
  // Parse HH:MM
  const [hours, minutes] = time.split(':').map(Number);

  // Get timezone offset (simplified - doesn't handle DST)
  const offset = TIMEZONE_OFFSETS[timezone] || 0;

  // Convert to UTC
  let utcHours = hours - offset;
  if (utcHours < 0) utcHours += 24;
  if (utcHours >= 24) utcHours -= 24;

  // EventBridge Scheduler cron format: cron(minutes hours day-of-month month day-of-week year)
  // For daily at a specific time: cron(MM HH * * ? *)
  return `cron(${minutes} ${utcHours} * * ? *)`;
}

async function scheduleExists(scheduleName: string): Promise<boolean> {
  try {
    await schedulerClient.send(
      new GetScheduleCommand({
        Name: scheduleName,
        GroupName: SCHEDULE_GROUP,
      })
    );
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      return false;
    }
    throw error;
  }
}

async function createSchedule(event: ScheduleEvent): Promise<string> {
  const scheduleName = getScheduleName(event.userId);

  if (!event.preferredCallTime || !event.timezone || !event.phoneNumber) {
    throw new Error('Missing required fields for schedule creation');
  }

  const cronExpression = convertToCronExpression(event.preferredCallTime, event.timezone);

  console.log(`Creating schedule: ${scheduleName} with cron: ${cronExpression}`);

  const result = await schedulerClient.send(
    new CreateScheduleCommand({
      Name: scheduleName,
      GroupName: SCHEDULE_GROUP,
      ScheduleExpression: cronExpression,
      ScheduleExpressionTimezone: 'UTC',
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      Target: {
        Arn: OUTBOUND_CALLER_ARN,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({
          userId: event.userId,
          phoneNumber: event.phoneNumber,
        }),
      },
      State: 'ENABLED',
      Description: `Daily journal call for user ${event.userId}`,
    })
  );

  return result.ScheduleArn!;
}

async function updateSchedule(event: ScheduleEvent): Promise<string> {
  const scheduleName = getScheduleName(event.userId);

  if (!event.preferredCallTime || !event.timezone || !event.phoneNumber) {
    throw new Error('Missing required fields for schedule update');
  }

  // Check if schedule exists
  const exists = await scheduleExists(scheduleName);

  if (!exists) {
    // Create if it doesn't exist
    return createSchedule(event);
  }

  const cronExpression = convertToCronExpression(event.preferredCallTime, event.timezone);

  console.log(`Updating schedule: ${scheduleName} with cron: ${cronExpression}`);

  const result = await schedulerClient.send(
    new UpdateScheduleCommand({
      Name: scheduleName,
      GroupName: SCHEDULE_GROUP,
      ScheduleExpression: cronExpression,
      ScheduleExpressionTimezone: 'UTC',
      FlexibleTimeWindow: {
        Mode: FlexibleTimeWindowMode.OFF,
      },
      Target: {
        Arn: OUTBOUND_CALLER_ARN,
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify({
          userId: event.userId,
          phoneNumber: event.phoneNumber,
        }),
      },
      State: 'ENABLED',
      Description: `Daily journal call for user ${event.userId}`,
    })
  );

  return result.ScheduleArn!;
}

async function deleteSchedule(userId: string): Promise<void> {
  const scheduleName = getScheduleName(userId);

  console.log(`Deleting schedule: ${scheduleName}`);

  try {
    await schedulerClient.send(
      new DeleteScheduleCommand({
        Name: scheduleName,
        GroupName: SCHEDULE_GROUP,
      })
    );
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      console.log(`Schedule not found (already deleted?): ${scheduleName}`);
      return;
    }
    throw error;
  }
}

async function updateUserScheduleArn(userId: string, scheduleArn: string | null): Promise<void> {
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

export async function handler(event: ScheduleEvent, context: Context): Promise<{ success: boolean; scheduleArn?: string }> {
  console.log('Scheduler manager invoked:', JSON.stringify(event));

  const { action, userId } = event;

  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    switch (action) {
      case 'CREATE':
      case 'UPDATE': {
        const scheduleArn = await (action === 'CREATE' ? createSchedule(event) : updateSchedule(event));
        await updateUserScheduleArn(userId, scheduleArn);
        console.log(`Schedule ${action.toLowerCase()}d: ${scheduleArn}`);
        return { success: true, scheduleArn };
      }

      case 'DELETE': {
        await deleteSchedule(userId);
        await updateUserScheduleArn(userId, null);
        console.log(`Schedule deleted for user: ${userId}`);
        return { success: true };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`Failed to ${action.toLowerCase()} schedule:`, error);
    throw error;
  }
}
