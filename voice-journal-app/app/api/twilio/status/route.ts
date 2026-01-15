import { NextResponse } from 'next/server';
import { parseTwilioWebhook } from '@/lib/twilio-verify';
import { updateCallRecord, getCallRecord } from '@/lib/dynamodb';
import type { TwilioStatusWebhookPayload, CallRecord } from '@/types';

// Map Twilio status to our status type
function mapTwilioStatus(twilioStatus: string): CallRecord['status'] {
  const statusMap: Record<string, CallRecord['status']> = {
    'initiated': 'initiated',
    'queued': 'initiated',
    'ringing': 'ringing',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'busy': 'busy',
    'no-answer': 'no-answer',
    'canceled': 'failed',
    'failed': 'failed',
  };

  return statusMap[twilioStatus] || 'failed';
}

// POST /api/twilio/status - Handle call status updates
export async function POST(request: Request) {
  try {
    const params = await parseTwilioWebhook(request) as unknown as TwilioStatusWebhookPayload;

    const callSid = params.CallSid;
    const callStatus = params.CallStatus;
    const callDuration = params.CallDuration ? parseInt(params.CallDuration, 10) : undefined;

    console.log('Status callback received:', {
      callSid,
      callStatus,
      callDuration,
    });

    if (!callSid) {
      return NextResponse.json({ error: 'Missing callSid' }, { status: 400 });
    }

    // Check if we have a record for this call
    const existingRecord = await getCallRecord(callSid);

    if (!existingRecord) {
      // Call might not have been recorded yet (e.g., initial status before voice webhook)
      console.log('No existing call record for status update:', callSid);
      return NextResponse.json({ status: 'skipped', reason: 'no_record' });
    }

    // Update the call record
    const updates: Partial<CallRecord> = {
      status: mapTwilioStatus(callStatus),
    };

    if (callDuration !== undefined) {
      updates.duration = callDuration;
    }

    await updateCallRecord(callSid, updates);

    console.log('Updated call status:', callSid, updates.status);

    return NextResponse.json({
      status: 'success',
      callStatus: updates.status,
    });
  } catch (error) {
    console.error('Error handling status callback:', error);
    return NextResponse.json(
      { error: 'Failed to process status update' },
      { status: 500 }
    );
  }
}
