#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Voice Journal - Deployment Script${NC}"
echo "=================================="

# Check for required tools
command -v aws >/dev/null 2>&1 || { echo -e "${RED}AWS CLI is required but not installed.${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}" >&2; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo -e "${RED}Terraform is required but not installed.${NC}" >&2; exit 1; }

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

# Check if terraform.tfvars exists
if [ ! -f "$TERRAFORM_DIR/terraform.tfvars" ]; then
    echo -e "${RED}Error: terraform/terraform.tfvars not found${NC}"
    echo "Please copy terraform/terraform.tfvars.example to terraform/terraform.tfvars and fill in your values"
    exit 1
fi

# Parse command line arguments
ACTION=${1:-"deploy"}

case $ACTION in
    init)
        echo -e "${YELLOW}Initializing Terraform...${NC}"
        cd "$TERRAFORM_DIR"
        terraform init
        echo -e "${GREEN}Terraform initialized!${NC}"
        ;;

    plan)
        echo -e "${YELLOW}Planning Terraform changes...${NC}"
        cd "$TERRAFORM_DIR"
        terraform plan
        ;;

    apply)
        echo -e "${YELLOW}Applying Terraform configuration...${NC}"
        cd "$TERRAFORM_DIR"
        terraform apply
        echo -e "${GREEN}Infrastructure deployed!${NC}"
        ;;

    push)
        echo -e "${YELLOW}Building and pushing Docker image...${NC}"
        cd "$TERRAFORM_DIR"

        # Get ECR URL from Terraform output
        ECR_URL=$(terraform output -raw ecr_repository_url)
        AWS_REGION=$(terraform output -raw 2>/dev/null | grep -oP 'region \K[a-z0-9-]+' || echo "us-east-1")

        # Read region from tfvars if available
        if grep -q "aws_region" terraform.tfvars; then
            AWS_REGION=$(grep "aws_region" terraform.tfvars | sed 's/.*=.*"\(.*\)"/\1/' | tr -d ' ')
        fi

        echo "ECR URL: $ECR_URL"
        echo "Region: $AWS_REGION"

        # Login to ECR
        echo -e "${YELLOW}Logging into ECR...${NC}"
        aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_URL"

        # Build Docker image
        echo -e "${YELLOW}Building Docker image...${NC}"
        cd "$PROJECT_ROOT"
        docker build -t "$ECR_URL:latest" .

        # Push to ECR
        echo -e "${YELLOW}Pushing to ECR...${NC}"
        docker push "$ECR_URL:latest"

        echo -e "${GREEN}Image pushed successfully!${NC}"
        ;;

    deploy-app)
        echo -e "${YELLOW}Triggering App Runner deployment...${NC}"
        cd "$TERRAFORM_DIR"

        SERVICE_ARN=$(terraform output -raw app_runner_service_arn)
        AWS_REGION=$(grep "aws_region" terraform.tfvars 2>/dev/null | sed 's/.*=.*"\(.*\)"/\1/' | tr -d ' ' || echo "us-east-1")

        aws apprunner start-deployment --service-arn "$SERVICE_ARN" --region "$AWS_REGION"

        echo -e "${GREEN}Deployment triggered!${NC}"
        echo "Check status at: https://console.aws.amazon.com/apprunner"
        ;;

    deploy)
        # Full deployment: apply terraform, push image, deploy app
        echo -e "${YELLOW}Running full deployment...${NC}"

        $0 apply
        $0 push
        $0 deploy-app

        cd "$TERRAFORM_DIR"
        echo ""
        echo -e "${GREEN}Deployment complete!${NC}"
        echo -e "App URL: $(terraform output -raw app_runner_service_url)"
        ;;

    destroy)
        echo -e "${RED}WARNING: This will destroy all infrastructure!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            cd "$TERRAFORM_DIR"
            terraform destroy
        else
            echo "Cancelled."
        fi
        ;;

    output)
        cd "$TERRAFORM_DIR"
        terraform output
        ;;

    *)
        echo "Usage: $0 {init|plan|apply|push|deploy-app|deploy|destroy|output}"
        echo ""
        echo "Commands:"
        echo "  init        - Initialize Terraform"
        echo "  plan        - Show Terraform plan"
        echo "  apply       - Apply Terraform configuration (create infrastructure)"
        echo "  push        - Build and push Docker image to ECR"
        echo "  deploy-app  - Trigger App Runner deployment"
        echo "  deploy      - Full deployment (apply + push + deploy-app)"
        echo "  destroy     - Destroy all infrastructure"
        echo "  output      - Show Terraform outputs"
        exit 1
        ;;
esac
