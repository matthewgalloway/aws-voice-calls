// User preferences for phone and call scheduling
export interface UserPreferences {
  userId: string;
  phoneNumber: string; // E.164 format: +1XXXXXXXXXX
  preferredCallTime: string; // HH:MM format (24-hour)
  timezone: string; // IANA timezone (e.g., "America/New_York")
  scheduleArn?: string; // EventBridge Schedule ARN
  isActive: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Call record for tracking call history
export interface CallRecord {
  callSid: string; // Twilio Call SID (primary key)
  userId: string;
  timestamp: string; // ISO timestamp
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  duration?: number; // Call duration in seconds
  recordingUrl?: string;
  recordingSid?: string;
  fromNumber: string;
  toNumber: string;
}

// Journal entry from transcribed recordings
export interface JournalEntry {
  entryId: string; // UUID (primary key)
  userId: string;
  createdAt: string; // ISO timestamp
  callSid: string; // Associated Twilio Call SID
  transcription: string;
  duration?: number; // Recording duration in seconds
  summary?: string; // AI-generated summary (future)
  mood?: string; // Detected mood (future)
}

// API request/response types
export interface SavePreferencesRequest {
  phoneNumber: string;
  preferredCallTime: string;
  timezone: string;
}

export interface SavePreferencesResponse {
  success: boolean;
  preferences?: UserPreferences;
  error?: string;
}

export interface GetJournalEntriesResponse {
  entries: JournalEntry[];
  nextCursor?: string;
}

// Twilio webhook payload types
export interface TwilioVoiceWebhookPayload {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  ApiVersion: string;
  Caller: string;
  Called: string;
}

export interface TwilioRecordingWebhookPayload extends TwilioVoiceWebhookPayload {
  RecordingUrl: string;
  RecordingSid: string;
  RecordingDuration: string;
}

export interface TwilioTranscriptionWebhookPayload {
  TranscriptionSid: string;
  TranscriptionText: string;
  TranscriptionStatus: string;
  TranscriptionUrl: string;
  RecordingSid: string;
  CallSid: string;
  AccountSid: string;
}

export interface TwilioStatusWebhookPayload extends TwilioVoiceWebhookPayload {
  CallDuration?: string;
  Timestamp?: string;
  SequenceNumber?: string;
}

// Common timezone options for the UI
export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
] as const;
