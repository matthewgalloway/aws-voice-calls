import twilio from 'twilio';
import { twiml } from 'twilio';

// Initialize Twilio client
// In production, credentials come from AWS Secrets Manager
// In development, from environment variables
let twilioClient: twilio.Twilio | null = null;

export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

// TwiML Response Builders
export function createJournalPromptTwiML(options: {
  userName?: string;
  isOutbound?: boolean;
  webhookBaseUrl: string;
}): string {
  const { userName, isOutbound, webhookBaseUrl } = options;
  const response = new twiml.VoiceResponse();

  // Greeting
  const greeting = userName
    ? `Hello ${userName}. Welcome to your voice journal.`
    : 'Welcome to Voice Journal.';

  response.say({ voice: 'Polly.Joanna' }, greeting);

  if (isOutbound) {
    response.say(
      { voice: 'Polly.Joanna' },
      "It's time for your daily journal entry."
    );
  }

  response.say(
    { voice: 'Polly.Joanna' },
    "Please share what's on your mind after the beep. Press any key when you're finished, or I'll stop recording after 5 minutes."
  );

  // Record the journal entry
  response.record({
    action: `${webhookBaseUrl}/api/twilio/recording`,
    transcribe: true,
    transcribeCallback: `${webhookBaseUrl}/api/twilio/transcription`,
    maxLength: 300, // 5 minutes max
    playBeep: true,
    finishOnKey: '1234567890*#',
  });

  // Fallback if no recording received
  response.say(
    { voice: 'Polly.Joanna' },
    "I didn't receive a recording. Please try again later. Goodbye."
  );

  return response.toString();
}

export function createRecordingCompleteTwiML(): string {
  const response = new twiml.VoiceResponse();

  response.say(
    { voice: 'Polly.Joanna' },
    "Thank you for sharing. Your journal entry has been saved. Have a wonderful day!"
  );

  response.hangup();

  return response.toString();
}

export function createErrorTwiML(message?: string): string {
  const response = new twiml.VoiceResponse();

  response.say(
    { voice: 'Polly.Joanna' },
    message || "Sorry, we encountered an error. Please try again later."
  );

  response.hangup();

  return response.toString();
}

export function createUnknownCallerTwiML(webhookBaseUrl: string): string {
  const response = new twiml.VoiceResponse();

  response.say(
    { voice: 'Polly.Joanna' },
    "Welcome to Voice Journal. We don't recognize this phone number. Please sign up at our website and add your phone number to your profile. Goodbye."
  );

  response.hangup();

  return response.toString();
}

// Initiate an outbound call
export async function initiateOutboundCall(options: {
  to: string;
  from: string;
  userId: string;
  webhookBaseUrl: string;
}): Promise<string> {
  const { to, from, userId, webhookBaseUrl } = options;
  const client = getTwilioClient();

  const call = await client.calls.create({
    to,
    from,
    url: `${webhookBaseUrl}/api/twilio/voice?direction=outbound&userId=${encodeURIComponent(userId)}`,
    statusCallback: `${webhookBaseUrl}/api/twilio/status`,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    statusCallbackMethod: 'POST',
  });

  return call.sid;
}
