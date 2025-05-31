# AWS Organization Infrastructure as Code

This project manages AWS Organization infrastructure using Pulumi with a multi-stack architecture.

## Architecture

The codebase is organized into two types of stacks:

1. **Foundation Stack** - Creates the core organization-wide resources:
   - AWS Organization
   - Organizational Units (OUs)
   - Service Control Policies (SCPs)
   - Tag Policies
   - AWS Accounts

2. **Environment Stacks** - Create environment-specific resources:
   - IAM Policies 
   - IAM Groups
   - IAM Roles
   - IAM Users

## Directory Structure

```
├── stacks/
│   ├── foundation/            # AWS Organization foundation
│   │   └── index.ts
│   └── environments/          # Environment-specific stacks
│       ├── prod/
│       │   └── index.ts       # Production environment resources
│       ├── staging/
│       │   └── index.ts       # Staging environment resources
│       └── dev/
│           └── index.ts       # Development environment resources
├── shared/
│   └── org-library/          # Shared utility functions
├── config/                    # Configuration files
│   ├── organization.ts
│   ├── organizationalUnits.ts
│   ├── accounts.ts
│   ├── policies.ts
│   ├── roles.ts
│   ├── groups.ts
│   └── users.ts
└── Pulumi.yaml                # Project configuration
```

## Deployment Order

The stacks must be deployed in the following order:

1. Foundation stack
2. Environment stacks (can be deployed in parallel)

### Deploying the Foundation Stack

```bash
pulumi stack select foundation
pulumi up
```

### Deploying Environment Stacks

```bash
# Deploy production environment
pulumi stack select prod
pulumi up

# Deploy staging environment
pulumi stack select staging
pulumi up

# Deploy development environment
pulumi stack select dev
pulumi up
```

## Stack Dependencies

- Environment stacks depend on the foundation stack for organization structure, OUs, and accounts
- Environment stacks use `StackReference` to access foundation stack outputs
- Each environment stack is independent of other environment stacks

## Data Flow

1. The foundation stack exports:
   - Organization details (ID, Root ID, ARN)
   - OU IDs and ARNs
   - Account IDs and ARNs
   - SCP and Tag Policy ARNs

2. Environment stacks import these values using stack references:
   ```typescript
   const foundation = new pulumi.StackReference("foundation");
   const organizationalUnits = foundation.getOutput("organizationalUnits");
   ```

## Configuration Files

- **organization.ts** - Organization details and feature sets
- **organizationalUnits.ts** - OU structure and hierarchy
- **accounts.ts** - AWS account definitions and OU assignments
- **policies.ts** - IAM policy definitions for all environments
- **roles.ts** - IAM role definitions for each OU
- **groups.ts** - IAM group definitions
- **users.ts** - IAM user definitions and access patterns

## Shared Utilities

The `shared/org-library` directory contains helper functions for creating and managing AWS resources:

- `organization` - AWS Organization creation
- `organizationalUnit` - OU creation and management
- `policy` - Policy creation (IAM, SCP, Tag)
- `group` - IAM group management
- `role` - IAM role management
- `user` - IAM user management
- `account` - AWS account management

## Cross-Environment Access

Users can be granted access to multiple environments through:
1. Group memberships specific to each environment
2. Cross-account role assumption using `sts:AssumeRole`
3. Direct policy attachments

Each environment stack creates only the resources relevant to that environment, ensuring clear separation and security boundaries.