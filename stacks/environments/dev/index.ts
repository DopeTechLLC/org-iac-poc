/**
 * Development Environment Stack
 * 
 * This stack creates development environment-specific resources:
 * 1. IAM Policies for development environment
 * 2. IAM Groups for development access
 * 3. IAM Roles for development accounts
 * 4. IAM Users with development access
 */

import { createPolicy } from "../../../shared/org-library/policy";
import { createIamGroup } from "../../../shared/org-library/group";
import { createIamUser } from "../../../shared/org-library/user";
import { PolicyType, PolicyEnvironment } from "../../../shared/org-library/policy/types";
import { GroupConfig, UserConfig, RoleConfig, RolesByEnvironment } from "../../../shared/org-library/config-types";
import { Input, Output } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Import configurations
import policiesConfig from "../../../shared/config/policies";
import rolesConfig from "../../../shared/config/roles";
import groupsConfig from "../../../shared/config/groups";
import usersConfig from "../../../shared/config/users";

// Reference the foundation stack
const foundation = new pulumi.StackReference("ali-dopetech-org/aws-org-infrastructure/foundation");

// Get organization information from foundation stack
const organization = foundation.getOutput("organization");
const organizationalUnits = foundation.getOutput("organizationalUnits");
const accounts = foundation.getOutput("accounts");

// Environment name
const environment = "dev";

// =========================================
// Environment IAM Policies
// Create policies for development environment
// =========================================

// Create managed policies
const managedPolicies = new Map();
for (const policy of policiesConfig.managedPolicies || []) {
    const result = createPolicy({
        name: policy.name,
        type: PolicyType.IAM,
        description: `Managed policy for ${policy.name}`,
        document: {
            Version: "2012-10-17" as const,
            Statement: policy.document.Statement.map(stmt => ({
                ...stmt,
                Effect: stmt.Effect as "Allow" | "Deny",
                Condition: stmt.Condition ? stmt.Condition as unknown as aws.iam.Conditions : undefined
            })) as aws.iam.PolicyStatement[]
        },
        path: "/managed-policies/",
        tags: {
            Environment: "all",
            ManagedBy: "pulumi"
        }
    });
    managedPolicies.set(policy.name, result);
}

// Create development-specific policies
const devPolicies = new Map();
for (const policy of policiesConfig.sandbox1 || []) { // Using sandbox1 for dev environment policies
    const result = createPolicy({
        name: policy.name,
        type: PolicyType.IAM,
        environment: PolicyEnvironment.SANDBOX1,
        description: `Development environment policy: ${policy.name}`,
        document: {
            Version: "2012-10-17" as const,
            Statement: policy.document.Statement.map((stmt: { Effect: string; Condition?: any }) => ({
                ...stmt,
                Effect: stmt.Effect as "Allow" | "Deny",
                Condition: stmt.Condition ? stmt.Condition as unknown as aws.iam.Conditions : undefined
            })) as aws.iam.PolicyStatement[]
        },
        path: `/env/dev/`,
        tags: {
            Environment: "dev",
            ManagedBy: "pulumi"
        }
    });
    devPolicies.set(policy.name, result);
}

// =========================================
// IAM Groups
// Create groups for development access
// =========================================

// Filter groups for development environment
const devGroupsConfig = groupsConfig.filter(group => 
    group.environment === 'dev' || group.environment === 'all');

// Create development groups
const groups = new Map();
for (const groupConfig of devGroupsConfig) {
    // Determine which policies to attach to this group
    let managedPolicyArns = [];
    
    // Attach appropriate policies based on group name
    if (groupConfig.name === "sandbox1-limited") {
        // Find the sandbox environments access policy
        const sandboxPolicy = devPolicies.get("sandbox-environments-access");
        if (sandboxPolicy) {
            managedPolicyArns.push(sandboxPolicy.arn);
        }
    } else if (groupConfig.name === "dev-developers") {
        // Find the sandbox full access policy
        const devPolicy = devPolicies.get("sandbox1-full-access");
        if (devPolicy) {
            managedPolicyArns.push(devPolicy.arn);
        }
        // You could also add AWS managed policies like ReadOnlyAccess
        managedPolicyArns.push("arn:aws:iam::aws:policy/ReadOnlyAccess");
    } else if (groupConfig.name === "org-everyone") {
        // Maybe just give read-only access to this group
        managedPolicyArns.push("arn:aws:iam::aws:policy/ReadOnlyAccess");
    }
    
    // Create the group with policy attachments
    const group = createIamGroup(groupConfig.name, {
        path: "/groups/",
        managedPolicyArns: managedPolicyArns
    });
    
    groups.set(groupConfig.name, group);
}

// =========================================
// IAM Roles
// Create roles for development OU
// =========================================

// Filter roles for development environment
const devRoles = rolesConfig['dev'] || [];

// Create roles from config
const roles = new Map();
for (const roleConfig of devRoles) {
    // Create assume role policy for IAM users
    const assumeRolePolicy = {
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: {
                AWS: "*"  // This will be restricted by the trust relationship
            },
            Action: "sts:AssumeRole",
            Condition: {
                StringEquals: {
                    "aws:PrincipalType": "User"
                }
            }
        }]
    };

    // Create the role
    const role = new aws.iam.Role(`${roleConfig.name}`, {
        name: roleConfig.name,
        description: roleConfig.description,
        assumeRolePolicy: JSON.stringify(assumeRolePolicy),
        tags: {
            Environment: environment,
            ManagedBy: "pulumi"
        }
    });

    // Attach managed policies to the role
    roleConfig.policyArns.forEach((policyArn: string, index: number) => {
        new aws.iam.RolePolicyAttachment(
            `${roleConfig.name}-policy-${index}`,
            {
                role: role.name,
                policyArn: policyArn
            }
        );
    });

    roles.set(roleConfig.name, role);
}

// =========================================
// IAM Users
// Create users with development access
// =========================================

// Filter users who need development access
const devUsers = usersConfig.filter(user => {
    // Users with development group memberships
    if (user.groups && user.groups.some(group => 
        groups.has(group))) {
        return true;
    }
    // Users with development role assignments
    if (user.assumeRoles && user.assumeRoles.some(role => 
        devRoles.some((devRole: RoleConfig) => devRole.name === role))) {
        return true;
    }
    // Users with development tag
    if (user.tags && (user.tags.Environment === 'dev' || user.tags.Environment === 'all')) {
        return true;
    }
    return false;
});

// Create development users
for (const user of devUsers) {
    // Create the IAM user
    const iamUser = createIamUser(user.username, {
        name: user.username,
        path: "/users/",
        tags: {
            Email: user.email,
            Description: user.description,
            Environment: 'dev',
            ManagedBy: "pulumi"
        },
        forceDestroy: true
    });

    // 1. Handle Group Memberships
    const userDevGroups = user.groups ? user.groups.filter(group => 
        groups.has(group)) : [];
    
    if (userDevGroups.length > 0) {
        // Get all the actual group objects for Pulumi's implicit dependency tracking
        const groupResources = userDevGroups.map(groupName => groups.get(groupName));
        
        // Use apply to create dependency chain and get actual group names
        pulumi.all(groupResources).apply(resolvedGroups => {
            // Extract the actual resource names that were created with suffixes
            const actualGroupNames = resolvedGroups.map(group => group.name);
            
            return new aws.iam.UserGroupMembership(`${user.username}-groups`, {
                user: iamUser.name,
                groups: actualGroupNames
            });
        });
    }

    // 2. Handle Direct Managed Policies
    if (user.managedPolicies) {
        for (const policyName of user.managedPolicies) {
            const policy = managedPolicies.get(policyName);
            if (policy) {
                new aws.iam.UserPolicyAttachment(`${user.username}-${policyName}`, {
                    user: iamUser.name,
                    policyArn: policy.arn
                });
            }
        }
    }

    // 3. Handle Role Assignments
    // Filter for development roles
    const devRolesToAssume = user.assumeRoles ? 
        user.assumeRoles.filter(role => 
            devRoles.some((devRole: RoleConfig) => devRole.name === role)) : [];

    // Create assume role policies for development roles
    for (const roleName of devRolesToAssume) {
        const role = roles.get(roleName);
        if (role) {
            // Create assume role policy using policy factory
            const userAssumeRolePolicy = createPolicy({
                name: `${user.username}-assume-${roleName}-policy`,
                type: PolicyType.IAM,
                description: `Policy allowing ${user.username} to assume role ${roleName}`,
                document: {
                    Version: "2012-10-17" as const,
                    Statement: [{
                        Effect: "Allow",
                        Action: "sts:AssumeRole",
                        Resource: role.arn
                    }]
                },
                path: "/users/assume-role-policies/",
                tags: {
                    User: user.username,
                    Role: roleName,
                    Environment: 'dev',
                    ManagedBy: "pulumi"
                }
            });

            // Attach the assume role policy to the user
            new aws.iam.UserPolicyAttachment(`${user.username}-assume-${roleName}`, {
                user: iamUser.name,
                policyArn: userAssumeRolePolicy.arn
            });
        }
    }
}

// =========================================
// Environment-specific SSM Parameters
// =========================================

// Store development role details
new aws.ssm.Parameter("dev-roles", {
    name: "/environments/dev/roles",
    type: "SecureString",
    value: pulumi.output(roles).apply(rs => {
        // Convert Map to array of entries
        const entries = Array.from(rs instanceof Map ? rs.entries() : []);
        return JSON.stringify(Object.fromEntries(
            entries.map(([name, role]) => [
                name, 
                {
                    arn: role.arn,
                    name: role.name
                }
            ])
        ));
    }),
    tags: {
        ManagedBy: "Pulumi",
        Component: "Roles",
        Environment: "Dev"
    }
});

// =========================================
// Stack Outputs
// Only export values needed for cross-stack references
// =========================================

export default {
    // Development environment information
    environment: {
        name: environment,
        ouId: organizationalUnits.apply(ous => ous && ous.dev ? ous.dev.id : undefined),
    },

    // Development roles
    roles: pulumi.output(roles).apply(rs => {
        const entries = Array.from(rs instanceof Map ? rs.entries() : []);
        return Object.fromEntries(
            entries.map(([name, role]) => [
                name, 
                {
                    arn: role.arn,
                    name: role.name
                }
            ])
        );
    }),

    // Development policies
    policies: {
        // Managed policies
        managed: pulumi.output(managedPolicies).apply(ps => {
            const entries = Array.from(ps instanceof Map ? ps.entries() : []);
            return Object.fromEntries(
                entries.map(([name, policy]) => [
                    name, 
                    {
                        arn: policy.arn,
                        name: policy.name
                    }
                ])
            );
        }),
        // Development-specific policies
        environment: pulumi.output(devPolicies).apply(ps => {
            const entries = Array.from(ps instanceof Map ? ps.entries() : []);
            return Object.fromEntries(
                entries.map(([name, policy]) => [
                    name, 
                    {
                        arn: policy.arn,
                        name: policy.name
                    }
                ])
            );
        })
    }
}; 