import { NextResponse } from 'next/server';
import { parseTwilioWebhook } from '@/lib/twilio-verify';
import { createRecordingCompleteTwiML } from '@/lib/twilio';
import { updateCallRecord, getCallRecord } from '@/lib/dynamodb';
import type { TwilioRecordingWebhookPayload } from '@/types';

// POST /api/twilio/recording - Handle recording completion callback
export async function POST(request: Request) {
  try {
    const params = await parseTwilioWebhook(request) as unknown as TwilioRecordingWebhookPayload;

    const callSid = params.CallSid;
    const recordingSid = params.RecordingSid;
    const recordingUrl = params.RecordingUrl;
    const recordingDuration = parseInt(params.RecordingDuration || '0', 10);

    console.log('Recording callback received:', {
      callSid,
      recordingSid,
      recordingDuration,
    });

    // Update call record with recording info
    if (callSid) {
      const callRecord = await getCallRecord(callSid);

      if (callRecord) {
        await updateCallRecord(callSid, {
          recordingSid,
          recordingUrl,
          duration: recordingDuration,
          status: 'completed',
        });

        console.log('Updated call record with recording info');
      } else {
        console.warn('Call record not found for callSid:', callSid);
      }
    }

    // Return TwiML to thank the user and end the call
    const twiml = createRecordingCompleteTwiML();

    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Error handling recording callback:', error);

    // Still return valid TwiML on error
    const twiml = createRecordingCompleteTwiML();
    return new NextResponse(twiml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
