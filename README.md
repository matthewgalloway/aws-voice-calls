# Voice Journal App

AI-powered voice journaling app deployed on AWS App Runner.

## Live URL
https://z6h8q2ekdy.us-east-1.awsapprunner.com

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Auth**: Clerk (v5)
- **Infra**: AWS App Runner, ECR, Terraform

## Project Structure
```
voice-journal-app/
├── app/                    # Next.js App Router pages
│   ├── api/health/        # Health check endpoint (excluded from Clerk middleware)
│   ├── dashboard/         # Protected dashboard with phone/time form
│   ├── sign-in/           # Clerk sign-in
│   └── sign-up/           # Clerk sign-up
├── components/            # React components (PhoneTimeForm, UserProfile, JournalEntriesList)
├── middleware.ts          # Clerk auth middleware (excludes /api/health)
├── terraform/             # AWS infrastructure (App Runner, ECR, IAM)
└── Dockerfile             # Multi-stage build for standalone Next.js
```

## Key Config Notes
- Health check: TCP on port 3000 (HTTP health checks failed due to Clerk middleware timing)
- Middleware excludes `/api/health` from Clerk auth via matcher pattern
- Docker uses `HOSTNAME=0.0.0.0` for proper network binding

## Deploy
```bash
cd voice-journal-app/terraform
cp terraform.tfvars.example terraform.tfvars  # Add Clerk keys
terraform init && terraform apply
./scripts/deploy.sh  # Build, push to ECR, trigger deployment
```
