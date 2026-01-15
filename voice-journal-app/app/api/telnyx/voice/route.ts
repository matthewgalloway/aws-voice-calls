import { NextRequest, NextResponse } from 'next/server';
import { parseTelnyxWebhook } from '@/lib/telnyx-verify';
import {
  createJournalPromptTeXML,
  createUnknownCallerTeXML,
  createErrorTeXML,
} from '@/lib/telnyx';
import { getUserByPhoneNumber, getUserPreferences, createCallRecord } from '@/lib/dynamodb';
import type { TelnyxWebhookPayload, TelnyxCallPayload } from '@/types';

// POST /api/telnyx/voice - Handle incoming/outgoing voice calls
export async function POST(request: NextRequest) {
  try {
    const webhookData = await parseTelnyxWebhook(request) as TelnyxWebhookPayload;
    const eventType = webhookData.data.event_type;
    const payload = webhookData.data.payload as TelnyxCallPayload;

    // Determine webhook base URL
    const webhookBaseUrl = process.env.APP_URL || process.env.NGROK_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Handle different call events
    if (eventType === 'call.initiated' || eventType === 'call.answered') {
      const direction = request.nextUrl.searchParams.get('direction') ||
        (payload.direction === 'outgoing' ? 'outbound' : 'inbound');

      const isOutbound = direction === 'outbound';

      let userId: string | undefined;

      if (isOutbound) {
        // For outbound calls, userId is passed in query params or client_state
        userId = request.nextUrl.searchParams.get('userId') ||
          (payload.client_state ? Buffer.from(payload.client_state, 'base64').toString() : undefined);
      } else {
        // For inbound calls, look up user by phone number
        const callerPhone = payload.from;

        if (callerPhone) {
          const user = await getUserByPhoneNumber(callerPhone);

          if (!user) {
            // Unknown caller
            const texml = createUnknownCallerTeXML();
            return new NextResponse(texml, {
              status: 200,
              headers: { 'Content-Type': 'application/xml' },
            });
          }

          userId = user.userId;
        }
      }

      // Create call record in DynamoDB
      if (payload.call_control_id && userId) {
        await createCallRecord({
          callControlId: payload.call_control_id,
          userId,
          direction: isOutbound ? 'outbound' : 'inbound',
          status: 'in-progress',
          fromNumber: payload.from,
          toNumber: payload.to,
        });
      }

      // Generate TeXML response
      const texml = createJournalPromptTeXML({
        isOutbound,
        webhookBaseUrl,
      });

      return new NextResponse(texml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    // For other events, just acknowledge
    return NextResponse.json({ status: 'acknowledged' });
  } catch (error) {
    console.error('Error handling voice webhook:', error);

    const texml = createErrorTeXML();
    return new NextResponse(texml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
