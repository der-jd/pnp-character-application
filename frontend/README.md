# Frontend Development Guide

## Overview

The frontend is a Next.js application that provides the user interface for the application. It's deployed as a static website.

## Architecture

- **Framework**: Next.js with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Static export to S3 + CloudFront
- **Authentication**: AWS Cognito integration

## Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and API clients
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
├── build_on_change.sh   # Intelligent build script
└── package.json         # Dependencies and scripts
```

## Key Features

### Authentication Integration

- Cognito user pool authentication
- JWT token handling
- Protected routes with middleware

#### Resources

- https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html?icmpid=apigateway_console_help
- https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-invoke-api-integrated-with-cognito-user-pool.html
- https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html
- https://theburningmonk.com/2024/09/fine-grained-access-control-in-api-gateway-with-cognito-access-tokens-and-scopes/

### API Communication

- Type-safe API client using shared schemas
- Error handling and retry logic
- Automatic token refresh

### Character Management

- Real-time character sheet updates
- History tracking and rollback
- Level-up workflows

## Code Standards

- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS utility classes
- **Type Safety**: Strict TypeScript configuration
- **Error Handling**: Consistent error boundaries

### Local Development

```bash
# Install dependencies
npm install --workspace frontend

# Start development server
npm run dev --workspace frontend

# Build for production
npm run build --workspace frontend
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
