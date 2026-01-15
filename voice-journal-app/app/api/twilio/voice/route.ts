import { NextRequest, NextResponse } from 'next/server';
import { parseTwilioWebhook } from '@/lib/twilio-verify';
import {
  createJournalPromptTwiML,
  createUnknownCallerTwiML,
  createErrorTwiML,
} from '@/lib/twilio';
import { getUserByPhoneNumber, getUserPreferences, createCallRecord } from '@/lib/dynamodb';
import type { TwilioVoiceWebhookPayload } from '@/types';

// POST /api/twilio/voice - Handle incoming/outgoing voice calls
export async function POST(request: NextRequest) {
  try {
    const params = await parseTwilioWebhook(request) as unknown as TwilioVoiceWebhookPayload;

    // Determine webhook base URL
    const webhookBaseUrl = process.env.APP_URL || process.env.NGROK_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Get direction from query params or Twilio payload
    const direction = request.nextUrl.searchParams.get('direction') ||
      (params.Direction?.toLowerCase() === 'outbound-api' ? 'outbound' : 'inbound');

    const isOutbound = direction === 'outbound';

    let userId: string | undefined;
    let userName: string | undefined;

    if (isOutbound) {
      // For outbound calls, userId is passed in query params
      userId = request.nextUrl.searchParams.get('userId') || undefined;

      if (userId) {
        const user = await getUserPreferences(userId);
        if (user) {
          // We don't have userName in preferences, could be fetched from Clerk
          // For now, just use the call without personalization
        }
      }
    } else {
      // For inbound calls, look up user by phone number
      const callerPhone = params.From;

      if (callerPhone) {
        const user = await getUserByPhoneNumber(callerPhone);

        if (!user) {
          // Unknown caller
          const twiml = createUnknownCallerTwiML(webhookBaseUrl);
          return new NextResponse(twiml, {
            status: 200,
            headers: { 'Content-Type': 'application/xml' },
          });
        }

        userId = user.userId;
      }
    }

    // Create call record in DynamoDB
    if (params.CallSid && userId) {
      await createCallRecord({
        callSid: params.CallSid,
        userId,
        direction: isOutbound ? 'outbound' : 'inbound',
        status: 'in-progress',
        fromNumber: params.From,
        toNumber: params.To,
      });
    }

    // Generate TwiML response
    const twiml = createJournalPromptTwiML({
      userName,
      isOutbound,
      webhookBaseUrl,
    });

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling voice webhook:', error);

    const twiml = createErrorTwiML();
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
