/**
 * Users configuration
 *
 * This file defines IAM users and their access patterns.
 * Users can have:
 * 1. Group memberships for shared permissions
 * 2. Direct managed policies for specific permissions
 * 3. Role assignments for temporary elevated access
 */

interface UserConfig {
    username: string;
    email: string;
    description: string;
    groups?: string[];              // Optional group memberships
    managedPolicies?: string[];     // Optional direct managed policies
    assumeRoles?: string[];         // Optional additional roles to assume
    environment: string;            // User's primary environment
    tags: {                         // Resource tags
        Environment: string;        // Must match environment or be "all"
        [key: string]: string;      // Additional tags
    };
}

const usersConfig: UserConfig[] = [
    // Production user - ReadOnly access through both group and role
    {
        username: "prod-readonly-user",
        email: "prod-readonly@example.com",
        groups: ["prod-readonly"],
        assumeRoles: ["prod-system-role"],
        description: "Production read-only access user",
        environment: "prod",
        tags: {
            Environment: "prod",
            Role: "ReadOnly",
            ManagedBy: "Pulumi"
        }
    },

    // QA Administrator with multiple access patterns
    {
        username: "qa-admin-user",
        email: "qa-admin@example.com",
        groups: ["qa-admin", "qa-team"],
        assumeRoles: ["qa-admin-role", "staging-access-role"],
        description: "QA environment administrator with staging access",
        environment: "staging",
        tags: {
            Environment: "staging",
            Role: "Admin",
            ManagedBy: "Pulumi"
        }
    },

    // Sandbox1 Power User with direct policy and role access
    {
        username: "sandbox1-poweruser",
        email: "sandbox1-power@example.com",
        groups: ["sandbox1-limited"],
        assumeRoles: ["sandbox1-limited-role"],
        managedPolicies: ["sandbox1-utilities-access"],
        description: "Sandbox1 power user with limited access",
        environment: "dev",
        tags: {
            Environment: "dev",
            Role: "PowerUser",
            ManagedBy: "Pulumi"
        }
    },

    // Sandbox2 ReadOnly User
    {
        username: "sandbox2-readonly",
        email: "sandbox2-readonly@example.com",
        groups: ["sandbox2-everyone"],
        assumeRoles: ["sandbox2-everyone-role"],
        description: "Sandbox2 read-only access user",
        environment: "dev",
        tags: {
            Environment: "dev",
            Role: "ReadOnly",
            ManagedBy: "Pulumi"
        }
    },

    // System Administrator with full access
    {
        username: "system-admin",
        email: "sysadmin@example.com",
        groups: ["admin", "platform-team"],
        assumeRoles: ["admin-role", "security-audit-role"],
        managedPolicies: ["system-admin-access"],
        description: "System administrator with full access",
        environment: "all",
        tags: {
            Environment: "all",
            Role: "Administrator",
            ManagedBy: "Pulumi"
        }
    },

    // Direct Policy User - Sandbox Access
    {
        username: "sandbox-direct-access",
        email: "sandbox-direct@example.com",
        managedPolicies: ["sandbox-environments-access"],
        description: "User with direct policy access to sandbox environments",
        environment: "dev",
        tags: {
            Environment: "dev",
            AccessType: "Direct",
            ManagedBy: "Pulumi"
        }
    }
];

export default usersConfig;
export type { UserConfig }; 