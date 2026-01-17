# Claude Code Context for Voice Journal App

## Project Overview
A voice journaling application that calls users at scheduled times to record voice journal entries. Built with Next.js 14, deployed on AWS App Runner, with Telnyx for telephony.

## Architecture

### Frontend/Backend (Next.js App Runner)
- **App**: `voice-journal-app/` - Next.js 14 app with Clerk authentication
- **Deployed at**: AWS App Runner (production URL needed in APP_URL env var)
- **Auth**: Clerk (`@clerk/nextjs`)

### Telephony (Telnyx)
- **Provider**: Telnyx (replaced Twilio)
- **Phone Number**: US number `+13324559523` (from env `TELNYX_PHONE_NUMBER`)
- **Connection ID**: Required for outbound calls
- **Webhooks**: `/api/telnyx/voice`, `/api/telnyx/status`, `/api/telnyx/recording`, `/api/telnyx/transcription`

### AWS Infrastructure (Terraform)
- **DynamoDB Tables**:
  - `voice-journal-prod-users` - User preferences (userId, phoneNumber, preferredCallTime, timezone, isActive)
  - `voice-journal-prod-calls` - Call records (callControlId, userId, timestamp, status)
  - `voice-journal-prod-entries` - Journal entries/transcriptions (entryId, userId, createdAt)

- **Lambda Functions**:
  - `voice-journal-prod-outbound-caller` - Initiates outbound calls via Telnyx
  - `voice-journal-prod-scheduler-manager` - Creates/updates EventBridge Schedules

- **EventBridge Scheduler**: Creates per-user schedules that trigger outbound-caller Lambda

- **Secrets Manager**: Stores Telnyx API key

### Key Files
- `lambda/outbound-caller/src/index.ts` - Outbound call initiation logic
- `lambda/scheduler-manager/src/index.ts` - Schedule management
- `app/api/preferences/route.ts` - User preferences API (triggers scheduler-manager)
- `app/api/telnyx/voice/route.ts` - Voice webhook handler
- `lib/telnyx.ts` - TeXML generation helpers
- `lib/dynamodb.ts` - Database operations
- `terraform/` - All AWS infrastructure

## Current State (as of Jan 2026)

### Working Features
- User authentication via Clerk
- User preferences (phone number, call time, timezone)
- Scheduled outbound calls via EventBridge Scheduler
- Basic call initiation via Telnyx
- Call status tracking in DynamoDB

### Next PR: Voice Greeting & Transcription
The user wants to add:
1. **Voice greeting** - Play "Hello, welcome to your journal" when call is answered
2. **Call transcription** - Transcribe what user says and store in database

**Options to explore**:
- Telnyx has built-in TTS (Text-to-Speech) via TeXML `<Say>` verb
- Telnyx has transcription capabilities
- ElevenLabs could be used for higher quality voice
- AWS Transcribe is another option for transcription
- AWS Polly for TTS

**Key integration points**:
- `lib/telnyx.ts` - `createJournalPromptTeXML()` generates the TeXML response
- `app/api/telnyx/voice/route.ts` - Handles call.answered event
- `app/api/telnyx/transcription/route.ts` - Webhook for transcription results

## Common Commands

```bash
# Local development
cd voice-journal-app
npm run dev

# Deploy Lambda (after changes)
cd lambda/outbound-caller
npm run build && npm run package
aws lambda update-function-code --function-name voice-journal-prod-outbound-caller --zip-file fileb://function.zip

# Terraform
cd terraform
terraform plan
terraform apply

# Test outbound call manually
aws lambda invoke --function-name voice-journal-prod-outbound-caller \
  --payload '{"userId": "user_38F0rlpDyDb4DdPpovG76s43K6d", "phoneNumber": "+447833097180"}' \
  --cli-binary-format raw-in-base64-out /tmp/response.json

# Check Lambda logs
aws logs tail /aws/lambda/voice-journal-prod-outbound-caller --since 5m

# Update user phone in DynamoDB
aws dynamodb update-item --table-name voice-journal-prod-users \
  --key '{"userId": {"S": "user_38F0rlpDyDb4DdPpovG76s43K6d"}}' \
  --update-expression "SET phoneNumber = :phone" \
  --expression-attribute-values '{":phone": {"S": "+447833097180"}}'
```

## User Info
- Test user ID: `user_38F0rlpDyDb4DdPpovG76s43K6d`
- User phone: `+447833097180` (UK number)
- Timezone: Europe/London

## Environment Variables (Production)
Key env vars needed in App Runner:
- `TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`, `TELNYX_CONNECTION_ID`, `TELNYX_PHONE_NUMBER`
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `APP_URL` - The App Runner URL for webhooks
- DynamoDB table names (see terraform outputs)
