# Voice Journal App

A voice journaling application that calls users at their preferred time to record voice journal entries.

## Features

- **Scheduled Calls**: Set your preferred time and timezone, receive automated calls
- **Voice Journaling**: Record your thoughts via phone call
- **Transcription**: (Coming soon) Automatic transcription of journal entries
- **User Dashboard**: View and manage your journal entries

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router)
- **Authentication**: Clerk
- **Telephony**: Telnyx (Voice API, TeXML)
- **Database**: AWS DynamoDB
- **Scheduling**: AWS EventBridge Scheduler
- **Compute**: AWS Lambda (outbound calls), AWS App Runner (web app)
- **Infrastructure**: Terraform

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Clerk Auth      │     │   DynamoDB      │
│  (App Runner)   │     └──────────────────┘     │  - users        │
│                 │                              │  - calls        │
│  /api/telnyx/*  │◀────────────────────────────▶│  - entries      │
│  /api/prefs     │     ┌──────────────────┐     └─────────────────┘
└────────┬────────┘     │  EventBridge     │
         │              │  Scheduler       │
         │              │  (per-user)      │
         │              └────────┬─────────┘
         │                       │
         │              ┌────────▼─────────┐
         │              │  Lambda:         │
         │              │  outbound-caller │
         │              └────────┬─────────┘
         │                       │
         │              ┌────────▼─────────┐
         └─────────────▶│     Telnyx       │
                        │   Voice API      │
                        └──────────────────┘
```

## Setup

### Prerequisites

- Node.js 18+
- AWS CLI configured
- Terraform
- Telnyx account with:
  - Phone number
  - TeXML Application (connection)
  - API credentials

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Telnyx
TELNYX_API_KEY=
TELNYX_PUBLIC_KEY=
TELNYX_CONNECTION_ID=
TELNYX_PHONE_NUMBER=

# AWS (for local dev with DynamoDB Local)
DYNAMODB_ENDPOINT=http://localhost:8000
```

### Local Development

```bash
cd voice-journal-app
npm install
npm run dev
```

For webhooks, use ngrok:
```bash
ngrok http 3000
# Set NGROK_URL in .env.local
```

### Deploy Infrastructure

```bash
cd voice-journal-app/terraform
terraform init
terraform plan
terraform apply
```

### Deploy Lambdas

```bash
# Outbound caller
cd lambda/outbound-caller
npm install && npm run build && npm run package
aws lambda update-function-code \
  --function-name voice-journal-prod-outbound-caller \
  --zip-file fileb://function.zip

# Scheduler manager
cd ../scheduler-manager
npm install && npm run build && npm run package
aws lambda update-function-code \
  --function-name voice-journal-prod-scheduler-manager \
  --zip-file fileb://function.zip
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/preferences` | GET/POST | User call preferences |
| `/api/journal` | GET | List journal entries |
| `/api/telnyx/voice` | POST | Telnyx voice webhook |
| `/api/telnyx/status` | POST | Call status updates |
| `/api/telnyx/recording` | POST | Recording webhook |
| `/api/telnyx/transcription` | POST | Transcription webhook |
| `/api/health` | GET | Health check |

## DynamoDB Tables

- **users**: User preferences (phone, call time, timezone)
- **calls**: Call history and status
- **entries**: Journal transcriptions

## Roadmap

- [x] User authentication
- [x] Scheduled outbound calls
- [x] Call status tracking
- [ ] Voice greeting on call answer
- [ ] Real-time transcription
- [ ] Journal entry storage
- [ ] Dashboard with entry history
- [ ] AI summarization of entries
