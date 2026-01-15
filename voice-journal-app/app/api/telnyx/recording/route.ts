import { NextResponse } from 'next/server';
import { parseTelnyxWebhook } from '@/lib/telnyx-verify';
import { createRecordingCompleteTeXML } from '@/lib/telnyx';
import { updateCallRecord, getCallRecord } from '@/lib/dynamodb';
import type { TelnyxWebhookPayload, TelnyxRecordingPayload } from '@/types';

// POST /api/telnyx/recording - Handle recording completion callback
export async function POST(request: Request) {
  try {
    const webhookData = await parseTelnyxWebhook(request) as TelnyxWebhookPayload;
    const eventType = webhookData.data.event_type;

    // Only handle recording.saved events
    if (eventType !== 'call.recording.saved') {
      return NextResponse.json({ status: 'ignored', event: eventType });
    }

    const payload = webhookData.data.payload as TelnyxRecordingPayload;

    const callControlId = payload.call_control_id;
    const recordingId = payload.recording_id;
    const recordingUrl = payload.recording_urls?.mp3;
    const durationMs = payload.duration_millis || 0;
    const durationSec = Math.round(durationMs / 1000);

    console.log('Recording callback received:', {
      callControlId,
      recordingId,
      durationSec,
    });

    // Update call record with recording info
    if (callControlId) {
      const callRecord = await getCallRecord(callControlId);

      if (callRecord) {
        await updateCallRecord(callControlId, {
          recordingId,
          recordingUrl,
          duration: durationSec,
          status: 'completed',
        });

        console.log('Updated call record with recording info');
      } else {
        console.warn('Call record not found for callControlId:', callControlId);
      }
    }

    // Return TeXML to thank the user and end the call
    const texml = createRecordingCompleteTeXML();

    return new NextResponse(texml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling recording callback:', error);

    // Still return valid TeXML on error
    const texml = createRecordingCompleteTeXML();
    return new NextResponse(texml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
