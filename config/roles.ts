/**
 * Roles configuration
 *
 * This file defines IAM roles for each OU and their permissions.
 */

const rolesConfig = {
  prod: [
    {
      name: "prod-system-role",
      description: "Role for system resources in prod OU. No user access.",
      policyArns: ["arn:aws:iam::aws:policy/ReadOnlyAccess"],
      tags: {
        Environment: "prod",
        ManagedBy: "Pulumi",
        Type: "System"
      }
    }
  ],
  production: [  // Alias for prod, to match environment name used in stacks
    {
      name: "prod-system-role",
      description: "Role for system resources in prod OU. No user access.",
      policyArns: ["arn:aws:iam::aws:policy/ReadOnlyAccess"],
      tags: {
        Environment: "prod",
        ManagedBy: "Pulumi",
        Type: "System"
      }
    }
  ],
  staging: [
    {
      name: "staging-access-role",
      description: "Access role for staging environment.",
      policyArns: ["arn:aws:iam::aws:policy/PowerUserAccess"],
      tags: {
        Environment: "staging",
        ManagedBy: "Pulumi",
        Type: "UserAccess"
      }
    }
  ],
  development: [
    {
      name: "dev-limited-role",
      description: "Limited access role for development environment.",
      policyArns: ["arn:aws:iam::aws:policy/PowerUserAccess"],
      tags: {
        Environment: "dev",
        ManagedBy: "Pulumi",
        Type: "Development"
      }
    }
  ],
  qa: [
    {
      name: "qa-admin-role",
      description: "Admin role for QA OU.",
      policyArns: ["arn:aws:iam::aws:policy/AdministratorAccess"],
      tags: {
        Environment: "qa",
        ManagedBy: "Pulumi",
        Type: "Admin"
      }
    }
  ],
  sandbox1: [
    {
      name: "sandbox1-limited-role",
      description: "Limited access role for sandbox1 OU.",
      policyArns: ["arn:aws:iam::aws:policy/PowerUserAccess"],
      tags: {
        Environment: "dev",
        ManagedBy: "Pulumi",
        Type: "Limited"
      }
    }
  ],
  sandbox2: [
    {
      name: "sandbox2-everyone-role",
      description: "Open access role for sandbox2 OU.",
      policyArns: ["arn:aws:iam::aws:policy/ReadOnlyAccess"],
      tags: {
        Environment: "dev",
        ManagedBy: "Pulumi",
        Type: "ReadOnly"
      }
    }
  ]
};

export default rolesConfig; 