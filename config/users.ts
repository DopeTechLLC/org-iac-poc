/**
 * Users configuration
 *
 * This file defines IAM users and their group memberships.
 * Each user corresponds to a specific role type defined in roles.ts
 */

const usersConfig = [
    // Production user - ReadOnly access
    {
        username: "prod-readonly-user",
        email: "prod-readonly@example.com",
        groups: ["prod-readonly"],
        description: "Production read-only access user"
    },

    // QA Administrator
    {
        username: "qa-admin-user",
        email: "qa-admin@example.com",
        groups: ["qa-admin"],
        description: "QA environment administrator"
    },

    // Sandbox1 Power User
    {
        username: "sandbox1-poweruser",
        email: "sandbox1-power@example.com",
        groups: ["sandbox1-limited"],
        description: "Sandbox1 power user with limited access"
    },

    // Sandbox2 ReadOnly User
    {
        username: "sandbox2-readonly",
        email: "sandbox2-readonly@example.com",
        groups: ["sandbox2-everyone"],
        description: "Sandbox2 read-only access user"
    },

    // System Administrator
    {
        username: "system-admin",
        email: "sysadmin@example.com",
        groups: ["admin"],
        description: "System administrator with full access"
    },

    // Direct Policy User - Sandbox Access
    {
        username: "sandbox-direct-access",
        email: "sandbox-direct@example.com",
        groups: [],  // No group membership
        description: "User with direct policy access to sandbox environments",
        managedPolicies: ["sandbox-environments-access"]  // Reference to custom managed policy
    }
];

export default usersConfig; 