/**
 * Groups configuration
 *
 * This file defines IAM groups and their intended permissions.
 */

const groupsConfig = [
  {
    name: "admin",
    description: "Admin group with full access to QA OU.",
    environment: "prod",
    tags: {
      Environment: "prod",
      ManagedBy: "Pulumi",
      Role: "Admin"
    }
  },
  {
    name: "sandbox1-limited",
    description: "Limited access group for sandbox1 OU.",
    environment: "dev",
    tags: {
      Environment: "dev",
      ManagedBy: "Pulumi",
      AccessLevel: "Limited"
    }
  },
  {
    name: "org-everyone",
    description: "Group for all users in the organization.",
    environment: "all",
    tags: {
      Environment: "all",
      ManagedBy: "Pulumi",
      Purpose: "SharedAccess"
    }
  },
  {
    name: "staging-deployers",
    description: "Group for users who can deploy to staging environment.",
    environment: "staging",
    tags: {
      Environment: "staging",
      ManagedBy: "Pulumi",
      Role: "Deployer"
    }
  },
  {
    name: "prod-readonly",
    description: "Read-only access to production resources.",
    environment: "prod",
    tags: {
      Environment: "prod",
      ManagedBy: "Pulumi",
      AccessLevel: "ReadOnly"
    }
  },
  {
    name: "dev-developers",
    description: "Standard access for developers in development environment.",
    environment: "dev",
    tags: {
      Environment: "dev",
      ManagedBy: "Pulumi",
      Role: "Developer"
    }
  }
];

export default groupsConfig; 