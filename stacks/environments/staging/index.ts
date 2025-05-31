/**
 * Staging Environment Stack
 * 
 * This stack creates staging environment-specific resources:
 * 1. IAM Policies for staging environment
 * 2. IAM Groups for staging access
 * 3. IAM Roles for staging accounts
 * 4. IAM Users with staging access
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
const environment = "staging";

// =========================================
// Environment IAM Policies
// Create policies for staging environment
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

// Create staging-specific policies
const stagingPolicies = new Map();
for (const policy of policiesConfig.staging || []) {
    const result = createPolicy({
        name: policy.name,
        type: PolicyType.IAM,
        environment: PolicyEnvironment.STAGING,
        description: `Staging environment policy: ${policy.name}`,
        document: {
            Version: "2012-10-17" as const,
            Statement: policy.document.Statement.map((stmt: { Effect: string; Condition?: any }) => ({
                ...stmt,
                Effect: stmt.Effect as "Allow" | "Deny",
                Condition: stmt.Condition ? stmt.Condition as unknown as aws.iam.Conditions : undefined
            })) as aws.iam.PolicyStatement[]
        },
        path: `/env/staging/`,
        tags: {
            Environment: "staging",
            ManagedBy: "pulumi"
        }
    });
    stagingPolicies.set(policy.name, result);
}

// =========================================
// IAM Groups
// Create groups for staging access
// =========================================

// Filter groups for staging environment
const stagingGroupsConfig = groupsConfig.filter(group => 
    group.environment === 'staging' || group.environment === 'all');

// Create staging groups
const groups = new Map();
for (const groupConfig of stagingGroupsConfig) {
    const group = createIamGroup(groupConfig.name, {
        path: "/groups/"
    });
    
    groups.set(groupConfig.name, group);
}

// =========================================
// IAM Roles
// Create roles for staging OU
// =========================================

// Filter roles for staging environment
const stagingRoles = rolesConfig['staging'] || [];

// Create roles from config
const roles = new Map();
for (const roleConfig of stagingRoles) {
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
// Create users with staging access
// =========================================

// Filter users who need staging access
const stagingUsers = usersConfig.filter(user => {
    // Users with staging group memberships
    if (user.groups && user.groups.some(group => 
        groups.has(group))) {
        return true;
    }
    // Users with staging role assignments
    if (user.assumeRoles && user.assumeRoles.some(role => 
        stagingRoles.some((stagingRole: RoleConfig) => stagingRole.name === role))) {
        return true;
    }
    // Users with staging tag
    if (user.tags && (user.tags.Environment === 'staging' || user.tags.Environment === 'all')) {
        return true;
    }
    return false;
});

// Create staging users
for (const user of stagingUsers) {
    // Create the IAM user
    const iamUser = createIamUser(user.username, {
        name: user.username,
        path: "/users/",
        tags: {
            Email: user.email,
            Description: user.description,
            Environment: 'staging',
            ManagedBy: "pulumi"
        },
        forceDestroy: true
    });

    // 1. Handle Group Memberships
    const stagingGroups = user.groups ? user.groups.filter(group => 
        groups.has(group)) : [];
    
    if (stagingGroups.length > 0) {
        new aws.iam.UserGroupMembership(`${user.username}-groups`, {
            user: iamUser.name,
            groups: stagingGroups
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
    // Filter for staging roles
    const stagingRolesToAssume = user.assumeRoles ? 
        user.assumeRoles.filter(role => 
            stagingRoles.some((stagingRole: RoleConfig) => stagingRole.name === role)) : [];

    // Create assume role policies for staging roles
    for (const roleName of stagingRolesToAssume) {
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
                    Environment: 'staging',
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

// Store staging role details
new aws.ssm.Parameter("staging-roles", {
    name: "/environments/staging/roles",
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
        Environment: "Staging"
    }
});

// =========================================
// Stack Outputs
// Only export values needed for cross-stack references
// =========================================

export default {
    // Staging environment information
    environment: {
        name: environment,
        ouId: organizationalUnits.apply(ous => ous.staging?.id),
    },

    // Staging roles
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

    // Staging policies
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
        // Staging-specific policies
        environment: pulumi.output(stagingPolicies).apply(ps => 
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