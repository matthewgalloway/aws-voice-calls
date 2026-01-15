import { NextResponse } from 'next/server';
import { parseTwilioWebhook } from '@/lib/twilio-verify';
import { getCallRecord, createJournalEntry } from '@/lib/dynamodb';
import type { TwilioTranscriptionWebhookPayload } from '@/types';

// POST /api/twilio/transcription - Handle transcription completion callback
export async function POST(request: Request) {
  try {
    const params = await parseTwilioWebhook(request) as unknown as TwilioTranscriptionWebhookPayload;

    const callSid = params.CallSid;
    const transcriptionText = params.TranscriptionText;
    const transcriptionStatus = params.TranscriptionStatus;
    const recordingSid = params.RecordingSid;

    console.log('Transcription callback received:', {
      callSid,
      transcriptionStatus,
      transcriptionLength: transcriptionText?.length || 0,
    });

    // Only process completed transcriptions
    if (transcriptionStatus !== 'completed' || !transcriptionText) {
      console.log('Skipping transcription - status:', transcriptionStatus);
      return NextResponse.json({ status: 'skipped' });
    }

    // Get the call record to find the userId
    if (!callSid) {
      console.warn('No callSid in transcription callback');
      return NextResponse.json({ error: 'Missing callSid' }, { status: 400 });
    }

    const callRecord = await getCallRecord(callSid);

    if (!callRecord) {
      console.warn('Call record not found for callSid:', callSid);
      return NextResponse.json({ error: 'Call record not found' }, { status: 404 });
    }

    // Create the journal entry
    const journalEntry = await createJournalEntry({
      userId: callRecord.userId,
      callSid,
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
