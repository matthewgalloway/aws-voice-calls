import { NextResponse } from 'next/server';
import { parseTelnyxWebhook } from '@/lib/telnyx-verify';
import { updateCallRecord, getCallRecord } from '@/lib/dynamodb';
import type { TelnyxWebhookPayload, TelnyxCallPayload, CallRecord } from '@/types';

// Map Telnyx call state to our status type
function mapTelnyxState(state: string, eventType: string): CallRecord['status'] {
  // Handle based on event type first
  if (eventType === 'call.hangup') {
    return 'completed';
  }
  if (eventType === 'call.initiated') {
    return 'initiated';
  }
  if (eventType === 'call.ringing') {
    return 'ringing';
  }
  if (eventType === 'call.answered') {
    return 'in-progress';
  }

  // Fallback to state mapping
  const stateMap: Record<string, CallRecord['status']> = {
    'parked': 'initiated',
    'bridging': 'ringing',
    'active': 'in-progress',
    'hangup': 'completed',
  };

  return stateMap[state] || 'failed';
}

// POST /api/telnyx/status - Handle call status updates
export async function POST(request: Request) {
  try {
    const webhookData = await parseTelnyxWebhook(request) as unknown as TelnyxWebhookPayload;
    const eventType = webhookData.data.event_type;
    const payload = webhookData.data.payload as TelnyxCallPayload;

    const callControlId = payload.call_control_id;
    const callState = payload.state;

    console.log('Status callback received:', {
      callControlId,
      eventType,
      callState,
    });

    if (!callControlId) {
      return NextResponse.json({ error: 'Missing callControlId' }, { status: 400 });
    }

    // Check if we have a record for this call
    const existingRecord = await getCallRecord(callControlId);

    if (!existingRecord) {
      // Call might not have been recorded yet
      console.log('No existing call record for status update:', callControlId);
      return NextResponse.json({ status: 'skipped', reason: 'no_record' });
    }

    // Calculate duration if call ended
    let duration: number | undefined;
    if (eventType === 'call.hangup' && payload.start_time && payload.end_time) {
      const startTime = new Date(payload.start_time).getTime();
      const endTime = new Date(payload.end_time).getTime();
      duration = Math.round((endTime - startTime) / 1000);
    }

    // Update the call record
    const updates: Partial<CallRecord> = {
      status: mapTelnyxState(callState, eventType),
    };

    if (duration !== undefined) {
      updates.duration = duration;
    }

    await updateCallRecord(callControlId, updates);

    console.log('Updated call status:', callControlId, updates.status);

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
