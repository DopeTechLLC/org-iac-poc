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
import policiesConfig from "../../../config/policies";
import rolesConfig from "../../../config/roles";
import groupsConfig from "../../../config/groups";
import usersConfig from "../../../config/users";

// Reference the foundation stack
const foundation = new pulumi.StackReference("foundation");

// Get organization information from foundation stack
const organization = foundation.getOutput("organization");
const organizationalUnits = foundation.getOutput("organizationalUnits");
const accounts = foundation.getOutput("accounts");

// Environment name
const environment = "development";

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
    const group = createIamGroup(groupConfig.name, {
        path: "/groups/"
    });
    
    groups.set(groupConfig.name, group);
}

// =========================================
// IAM Roles
// Create roles for development OU
// =========================================

// Filter roles for development environment
const devRoles = rolesConfig['development'] || [];

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
        new aws.iam.UserGroupMembership(`${user.username}-groups`, {
            user: iamUser.name,
            groups: userDevGroups
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
    value: pulumi.output(roles).apply(rs => 
        JSON.stringify(Object.fromEntries(
            Array.from(rs.entries()).map(([name, role]) => [
                name, 
                {
                    arn: role.arn,
                    name: role.name
                }
            ])
        ))
    ),
    tags: {
        ManagedBy: "Pulumi",
        Component: "Roles",
        Environment: "Development"
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
        ouId: organizationalUnits.apply(ous => ous.development?.id),
    },

    // Development roles
    roles: pulumi.output(roles).apply(rs => 
        Object.fromEntries(
            Array.from(rs.entries()).map(([name, role]) => [
                name, 
                {
                    arn: role.arn,
                    name: role.name
                }
            ])
        )
    ),

    // Development policies
    policies: {
        // Managed policies
        managed: pulumi.output(managedPolicies).apply(ps => 
            Object.fromEntries(
                Array.from(ps.entries()).map(([name, policy]) => [
                    name, 
                    {
                        arn: policy.arn,
                        name: policy.name
                    }
                ])
            )
        ),
        // Development-specific policies
        environment: pulumi.output(devPolicies).apply(ps => 
            Object.fromEntries(
                Array.from(ps.entries()).map(([name, policy]) => [
                    name, 
                    {
                        arn: policy.arn,
                        name: policy.name
                    }
                ])
            )
        )
    }
}; 