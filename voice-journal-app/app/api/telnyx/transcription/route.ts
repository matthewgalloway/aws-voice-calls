import { NextResponse } from 'next/server';
import { parseTelnyxWebhook } from '@/lib/telnyx-verify';
import { getCallRecord, createJournalEntry } from '@/lib/dynamodb';
import type { TelnyxWebhookPayload, TelnyxTranscriptionPayload } from '@/types';

// POST /api/telnyx/transcription - Handle transcription completion callback
export async function POST(request: Request) {
  try {
    const webhookData = await parseTelnyxWebhook(request) as TelnyxWebhookPayload;
    const eventType = webhookData.data.event_type;

    // Only handle transcription.completed events
    if (eventType !== 'call.transcription') {
      return NextResponse.json({ status: 'ignored', event: eventType });
    }

    const payload = webhookData.data.payload as TelnyxTranscriptionPayload;

    const callControlId = payload.call_control_id;
    const transcriptionText = payload.transcription_text;
    const transcriptionStatus = payload.status;

    console.log('Transcription callback received:', {
      callControlId,
      transcriptionStatus,
      transcriptionLength: transcriptionText?.length || 0,
    });

    // Only process completed transcriptions
    if (transcriptionStatus !== 'completed' || !transcriptionText) {
      console.log('Skipping transcription - status:', transcriptionStatus);
      return NextResponse.json({ status: 'skipped' });
    }

    // Get the call record to find the userId
    if (!callControlId) {
      console.warn('No callControlId in transcription callback');
      return NextResponse.json({ error: 'Missing callControlId' }, { status: 400 });
    }

    const callRecord = await getCallRecord(callControlId);

    if (!callRecord) {
      console.warn('Call record not found for callControlId:', callControlId);
      return NextResponse.json({ error: 'Call record not found' }, { status: 404 });
    }

    // Create the journal entry
    const journalEntry = await createJournalEntry({
      userId: callRecord.userId,
      callControlId,
      transcription: transcriptionText,
      duration: callRecord.duration,
    });

    console.log('Created journal entry:', journalEntry.entryId);

    return NextResponse.json({
      status: 'success',
      entryId: journalEntry.entryId,
    });
  } catch (error) {
    console.error('Error handling transcription callback:', error);
    return NextResponse.json(
      { error: 'Failed to process transcription' },
      { status: 500 }
    );
  }
}
