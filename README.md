# PnP Character Application "World Hoppers"

[![CircleCI](https://circleci.com/gh/der-jd/pnp-character-application.svg?style=shield&circle-token=d13a30ac2283a67c44f5efd1d88fbc07372bacf9)](https://circleci.com/gh/der-jd/pnp-character-application)

Serverless web application for characters of a custom Pen & Paper game called "World Hoppers".

## 🎯 Quick Start

```bash
# Install dependencies
npm install

# Install linter for terraform
npm install-lint-terraform

# Initialize Terraform
cd terraform && terraform init

# Start frontend development
npm run dev --workspace frontend
```

## 🏗️ Architecture

```mermaid
graph TB
    %% User Interface Layer
    User[fa:fa-user Users] --> WebApp[fa:fa-globe Web Application]

    %% Content Delivery
    WebApp --> CloudFront[fa:fa-cloud CloudFront CDN]
    CloudFront --> S3[fa:fa-database S3 Hosting]

    %% Authentication & Security
    WebApp --> |fa:fa-lock Auth| Cognito[fa:fa-shield-alt Amazon Cognito]
    Cognito --> |fa:fa-ticket JWT| WebApp

    %% API Layer
    WebApp --> |fa:fa-signal API Calls| APIGW[fa:fa-server API Gateway]
    APIGW --> |fa:fa-shield Validate| Cognito

    %% Compute Layer
    APIGW --> |fa:fa-book Read| Lambda[fa:fa-code AWS Lambda]
    APIGW --> |fa:fa-edit Write| StepFunctions[fa:fa-project-diagram AWS Step Functions]

    %% Data Layer
    Lambda --> |fa:fa-database Data| DynamoDB[fa:fa-database DynamoDB]
    StepFunctions --> |fa:fa-database Data| DynamoDB

    %% Styling
    classDef frontend fill:#ffffff,stroke:#333333,stroke-width:2px,color:#333333
    classDef compute fill:#FF9900,stroke:#FF9900,stroke-width:2px,color:#000000
    classDef data fill:#146EB4,stroke:#146EB4,stroke-width:2px,color:#ffffff
    classDef storage fill:#569A31,stroke:#569A31,stroke-width:2px,color:#ffffff
    classDef api fill:#9B59B6,stroke:#9B59B6,stroke-width:2px,color:#ffffff
    classDef workflow fill:#E91563,stroke:#E91563,stroke-width:2px,color:#ffffff
    classDef security fill:#DD344C,stroke:#DD344C,stroke-width:2px,color:#ffffff

    class User,WebApp frontend
    class Lambda compute
    class StepFunctions workflow
    class DynamoDB data
    class S3 storage
    class CloudFront,APIGW api
    class Cognito security
```

### Tech Stack

- **Cloud**: [Amazon Web Services (AWS)](https://aws.amazon.com/)
- **CDN**: [AWS CloudFront](https://aws.amazon.com/cloudfront/)
- **Frontend**: Static website with [Next.js](https://nextjs.org/), hosted with [AWS S3](https://aws.amazon.com/s3/)
- **API schema**: Definitions and validations with [Zod](https://zod.dev/)
- **Backend REST API**: exposed via [AWS API Gateway](https://aws.amazon.com/api-gateway/)
- **Backend**: [Node.js](https://nodejs.org/) AWS Lambda functions and Step Functions
- **Infrastructure as Code**: [Terraform](https://www.terraform.io/) + [HCP Terraform Cloud](https://developer.hashicorp.com/terraform/cloud-docs)
- **CI/CD**: [CircleCI](https://circleci.com/)
- **NoSQL Database**: [DynamoDB](https://aws.amazon.com/dynamodb/)
- **Authentication**: [AWS Cognito](https://aws.amazon.com/cognito/)
- **DNS & Domain management**: [AWS Route53](https://aws.amazon.com/route53/)
- **Data Backup**: [AWS Backup](https://aws.amazon.com/backup/)
- **Testing**: [Vitest](https://vitest.dev/)
- **Monitoring & Logging**: [AWS CloudWatch](https://aws.amazon.com/cloudwatch/)
- **Alerting**: [AWS SNS](https://aws.amazon.com/sns/)

## 💾 Data Backup Strategy

The application implements a backup strategy using **AWS Backup** to ensure data durability and recovery capabilities:

- **Automated Backup Schedule**: Daily backups and monthly backups
- **Retention Policy**: Daily backups retained for 90 days, monthly backups retained for 730 days (24 months)
- **Backup Monitoring**: CloudWatch alarms alert on failed or expired backup jobs via SNS notifications

Backup configurations are managed through Terraform in the `terraform/backup.tf` module.

## 🚀 Deployment

**Continuous deployment** via CircleCI, see [CircleCI Configuration](./.circleci/README.md) for details.

## 📁 Repository Structure

```
pnp-character-application/
├── .circleci/          # CI/CD configuration
├── api-spec/           # Shared API types and schemas
├── backend/            # Node.js Lambda functions and Step Functions
├── frontend/           # Next.js client application
├── scripts/            # Utility CLI tools
├── terraform/          # AWS infrastructure
└── package.json        # Workspace configuration
```

## Navigation

### 📁 **Component Guides**

- **[📜 API Spec](./api-spec/README.md)** - API types and schemas
- **[🔧 Backend](./backend/README.md)** - Lambda functions and business logic
- **[🎨 Frontend](./frontend/README.md)** - Next.js client application
- **[🏗️ Infrastructure](./terraform/README.md)** - AWS resources and deployment

### 📚 **Specialized Topics**

- **[🧪 Backend - Unit Tests](./backend/test/unit-tests/README.md)**
- **[🧪 Backend - Component Tests](./backend/test/component-tests/README.md)**
- **[🚀 CI/CD Pipeline](./.circleci/README.md)**
- **[🤖 AI Agent Guide](./AGENTS.md)**
