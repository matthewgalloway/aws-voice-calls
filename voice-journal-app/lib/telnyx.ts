import Telnyx from 'telnyx';

// Initialize Telnyx client
let telnyxClient: ReturnType<typeof Telnyx> | null = null;

export function getTelnyxClient(): ReturnType<typeof Telnyx> {
  if (!telnyxClient) {
    const apiKey = process.env.TELNYX_API_KEY;

    if (!apiKey) {
      throw new Error('Telnyx API key not configured');
    }

    telnyxClient = Telnyx(apiKey);
  }
  return telnyxClient;
}

// TeXML Response Builders (Telnyx's TwiML equivalent)
export function createJournalPromptTeXML(options: {
  userName?: string;
  isOutbound?: boolean;
  webhookBaseUrl: string;
}): string {
  const { userName, isOutbound, webhookBaseUrl } = options;

  // Greeting
  const greeting = userName
    ? `Hello ${userName}. Welcome to your voice journal.`
    : 'Welcome to Voice Journal.';

  const timePrompt = isOutbound
    ? "It's time for your daily journal entry."
    : '';

  // TeXML format (similar to TwiML but with Telnyx-specific tags)
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female">${greeting}</Say>
  ${timePrompt ? `<Say voice="female">${timePrompt}</Say>` : ''}
  <Say voice="female">Please share what's on your mind after the beep. Press any key when you're finished, or I'll stop recording after 5 minutes.</Say>
  <Record
    action="${webhookBaseUrl}/api/telnyx/recording"
    maxLength="300"
    playBeep="true"
    finishOnKey="1234567890*#"
    transcribe="true"
    transcribeCallback="${webhookBaseUrl}/api/telnyx/transcription"
  />
  <Say voice="female">I didn't receive a recording. Please try again later. Goodbye.</Say>
</Response>`;
}

export function createRecordingCompleteTeXML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female">Thank you for sharing. Your journal entry has been saved. Have a wonderful day!</Say>
  <Hangup />
</Response>`;
}

export function createErrorTeXML(message?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female">${message || "Sorry, we encountered an error. Please try again later."}</Say>
  <Hangup />
</Response>`;
}

export function createUnknownCallerTeXML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female">Welcome to Voice Journal. We don't recognize this phone number. Please sign up at our website and add your phone number to your profile. Goodbye.</Say>
  <Hangup />
</Response>`;
}

// Initiate an outbound call using Telnyx API
export async function initiateOutboundCall(options: {
  to: string;
  from: string;
  userId: string;
  webhookBaseUrl: string;
  connectionId: string;
}): Promise<string> {
  const { to, from, userId, webhookBaseUrl, connectionId } = options;
  const client = getTelnyxClient();

  const call = await client.calls.create({
    connection_id: connectionId,
    to,
    from,
    answering_machine_detection: 'detect',
    webhook_url: `${webhookBaseUrl}/api/telnyx/voice?direction=outbound&userId=${encodeURIComponent(userId)}`,
    webhook_url_method: 'POST',
  });

  return call.data.call_control_id;
}

// Send TeXML response for call control
export async function answerWithTeXML(options: {
  callControlId: string;
  texmlUrl: string;
}): Promise<void> {
  const client = getTelnyxClient();

  await client.calls.answer(options.callControlId, {
    texml_url: options.texmlUrl,
  });
}
