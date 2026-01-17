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
  callControlId: string; // Telnyx Call Control ID (primary key)
  userId: string;
  timestamp: string; // ISO timestamp
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  duration?: number; // Call duration in seconds
  recordingUrl?: string;
  recordingId?: string;
  fromNumber: string;
  toNumber: string;
}

// Journal entry from transcribed recordings
export interface JournalEntry {
  entryId: string; // UUID (primary key)
  userId: string;
  createdAt: string; // ISO timestamp
  callControlId: string; // Associated Telnyx Call Control ID
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

// Telnyx webhook payload types
export interface TelnyxWebhookPayload {
  data: {
    event_type: string;
    id: string;
    occurred_at: string;
    payload: TelnyxCallPayload | TelnyxRecordingPayload | TelnyxTranscriptionPayload;
    record_type: string;
  };
  meta: {
    attempt: number;
    delivered_to: string;
  };
}

export interface TelnyxCallPayload {
  call_control_id: string;
  call_leg_id: string;
  call_session_id: string;
  connection_id: string;
  from: string;
  to: string;
  direction: 'incoming' | 'outgoing';
  state: 'parked' | 'bridging' | 'active' | 'hangup';
  client_state?: string;
  start_time?: string;
  end_time?: string;
}

export interface TelnyxRecordingPayload {
  call_control_id: string;
  call_leg_id: string;
  call_session_id: string;
  connection_id: string;
  recording_id: string;
  recording_urls: {
    mp3: string;
    wav: string;
  };
  channels: string;
  duration_millis: number;
}

export interface TelnyxTranscriptionPayload {
  call_control_id: string;
  call_leg_id: string;
  call_session_id: string;
  transcription_id: string;
  transcription_text: string;
  status: 'completed' | 'failed';
  recording_id: string;
}

// Common timezone options for the UI
export const TIMEZONE_OPTIONS = [
  // US timezones
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  // European timezones
  { value: 'Europe/London', label: 'UK - London (GMT/BST)' },
  { value: 'Europe/Dublin', label: 'Ireland - Dublin (GMT/IST)' },
  { value: 'Europe/Lisbon', label: 'Portugal - Lisbon (WET/WEST)' },
  { value: 'Europe/Paris', label: 'France - Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Germany - Berlin (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Netherlands - Amsterdam (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Spain - Madrid (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Italy - Rome (CET/CEST)' },
  { value: 'Europe/Athens', label: 'Greece - Athens (EET/EEST)' },
  // Other timezones
  { value: 'Asia/Tokyo', label: 'Japan - Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'China - Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'UAE - Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Australia - Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Australia - Melbourne (AEST/AEDT)' },
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
] as const;
