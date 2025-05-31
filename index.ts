/**
 * AWS Organization and IAM Infrastructure Configuration
 * 
 * This file orchestrates the creation of AWS Organization and IAM resources:
 * 1. AWS Organization and Organizational Units
 * 2. Service Control Policies and Tag Policies
 * 3. IAM Policies for different environments
 * 4. Groups and their policy attachments
 * 5. Users and their group memberships
 */

import { createOrganization } from "./org-library/organization";
import { createOrganizationalUnit } from "./org-library/organizationalUnit";
import { createPolicy } from "./org-library/policy";
import { createIamGroup } from "./org-library/group";
import { createIamUser } from "./org-library/user";
import { PolicyType, PolicyEnvironment, SCPOptions, TagPolicyOptions } from "./org-library/policy/types";
import { Input, Output } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import usersConfig from "./config/users";
import policiesConfig from "./config/policies";

// Import configurations
import organizationConfig from "./config/organization";
import ouConfig from "./config/organizationalUnits";
import accountsConfig from "./config/accounts";
import rolesConfig from "./config/roles";
import groupsConfig from "./config/groups";

// =========================================
// AWS Organization
// Create the root organization and OUs
// =========================================

// Create the root organization
const organization = createOrganization(organizationConfig.name, {
    awsServiceAccessPrincipals: organizationConfig.orgArgs.awsServiceAccessPrincipals,
    enabledPolicyTypes: organizationConfig.orgArgs.awsManagedPolicyTypes,
    featureSet: organizationConfig.orgArgs.featureSet
});

// Create Organizational Units
const organizationalUnits = new Map();

// Function to recursively create OUs
const createOUs = (ouDef: any, parentId: Input<string>) => {
    const ou = createOrganizationalUnit(ouDef.name, {
        name: ouDef.name,
        parentId,
        tags: {
            Environment: ouDef.name,
            ManagedBy: "Pulumi",
            Team: "Platform"
        }
    });
    organizationalUnits.set(ouDef.name, ou);

    // Recursively create child OUs if they exist
    if (ouDef.children) {
        Object.values(ouDef.children).forEach((childOu: any) => {
            createOUs(childOu, ou.id);
        });
    }
};

// Create all OUs from config
Object.values(ouConfig).forEach((ouDef: any) => {
    createOUs(ouDef, organization.roots[0].id);
});

// =========================================
// Service Control Policies
// Apply organization-wide controls
// =========================================

// Create Service Control Policies
const productionSCPOptions: SCPOptions = {
    name: "production-scp",
    path: "/service-control-policies/",
    description: "Production environment service control policy",
    type: PolicyType.SCP,
    document: {
        Version: "2012-10-17",
        Statement: [{
            Sid: "DenyOrganizationLeave",
            Effect: "Deny",
            Action: [
                "organizations:LeaveOrganization",
                "organizations:DeleteOrganization",
                "organizations:RemoveAccountFromOrganization"
            ],
            Resource: "*"
        }]
    },
    targetId: organizationalUnits.get("production")?.id,
    tags: {
        Environment: "Production",
        ManagedBy: "Pulumi",
        Type: "ServiceControlPolicy"
    }
};

const sandboxSCPOptions: SCPOptions = {
    name: "sandbox-scp",
    path: "/service-control-policies/",
    description: "Sandbox environment service control policy",
    type: PolicyType.SCP,
    document: {
        Version: "2012-10-17",
        Statement: [{
            Sid: "DenyOrganizationAndIAMOperations",
            Effect: "Deny",
            Action: [
                "organizations:*",
                "account:*",
                "iam:CreateUser",
                "iam:CreateRole",
                "iam:CreatePolicy"
            ],
            Resource: "*"
        }]
    },
    targetId: organizationalUnits.get("sandbox")?.id,
    tags: {
        Environment: "Sandbox",
        ManagedBy: "Pulumi",
        Type: "ServiceControlPolicy"
    }
};

// Create Tag Policy
const tagPolicyOptions: TagPolicyOptions = {
    name: "resource-tag-policy",
    path: "/tag-policies/",
    description: "Enforces tagging standards across the organization",
    type: PolicyType.TAG,
    document: {
        Version: "2012-10-17",
        Statement: [{
            Sid: "RequireEnvironmentAndOwnerTags",
            Effect: "Deny",
            Action: [
                "ec2:RunInstances",
                "ec2:CreateVolume",
                "s3:CreateBucket",
                "rds:CreateDBInstance"
            ],
            Resource: "*",
            Condition: {
                StringNotLike: {
                    "aws:RequestTag/Environment": ["prod", "staging", "sandbox"],
                    "aws:RequestTag/Owner": ["*@dopetech.io"]
                }
            }
        }]
    },
    enforceFor: [
        "ec2:*",
        "s3:*",
        "rds:*"
    ],
    requiredTags: [
        "Environment",
        "Owner"
    ],
    allowedValues: {
        Environment: ["prod", "staging", "sandbox"],
        Owner: ["*@dopetech.io"]
    },
    tags: {
        Type: "TagPolicy",
        ManagedBy: "Pulumi"
    }
};

const productionSCP = createPolicy(productionSCPOptions);
const sandboxSCP = createPolicy(sandboxSCPOptions);
const resourceTagPolicy = createPolicy(tagPolicyOptions);

// =========================================
// Environment IAM Policies
// Create policies for different environments
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

// Create environment-specific policies
const createEnvironmentPolicies = (policies: any[], environment: PolicyEnvironment) => {
    const policyMap = new Map();
    for (const policy of policies || []) {
        const result = createPolicy({
            name: policy.name,
            type: PolicyType.IAM,
            environment: environment,
            description: `${environment} environment policy: ${policy.name}`,
            document: {
                Version: "2012-10-17" as const,
                Statement: policy.document.Statement.map((stmt: { Effect: string; Condition?: any }) => ({
                    ...stmt,
                    Effect: stmt.Effect as "Allow" | "Deny",
                    Condition: stmt.Condition ? stmt.Condition as unknown as aws.iam.Conditions : undefined
                })) as aws.iam.PolicyStatement[]
            },
            path: `/env/${environment.toLowerCase()}/`,
            tags: {
                Environment: environment.toLowerCase(),
                ManagedBy: "pulumi"
            }
        });
        policyMap.set(policy.name, result);
    }
    return policyMap;
};

const prodPolicies = createEnvironmentPolicies(policiesConfig.prod, PolicyEnvironment.PROD);
const stagingPolicies = createEnvironmentPolicies(policiesConfig.staging, PolicyEnvironment.STAGING);
const sandboxPolicies = createEnvironmentPolicies(policiesConfig.sandbox1, PolicyEnvironment.SANDBOX1);

// =========================================
// IAM Groups
// Create groups and attach policies
// =========================================

// Create groups from config
const groups = new Map();
for (const groupConfig of groupsConfig) {
    const group = createIamGroup(groupConfig.name, {
        path: "/groups/"
    });
    
    groups.set(groupConfig.name, group);
}

// =========================================
// IAM Roles
// Create roles for different OUs
// =========================================

// Create roles from config
const roles = new Map();
for (const [ouName, ouRoles] of Object.entries(rolesConfig)) {
    for (const roleConfig of ouRoles) {
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
                Environment: ouName,
                ManagedBy: "pulumi"
            }
        });

        // Attach managed policies to the role
        roleConfig.policyArns.forEach((policyArn, index) => {
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
}

// =========================================
// IAM Users
// Create users and establish access
// =========================================

// Create users from config
for (const user of usersConfig) {
    // Create the IAM user
    const iamUser = createIamUser(user.username, {
        name: user.username,
        path: "/users/",
        tags: {
            Email: user.email,
            Description: user.description,
            ManagedBy: "pulumi"
        },
        forceDestroy: true
    });

    // 1. Handle Group Memberships
    if (user.groups && user.groups.length > 0) {
        new aws.iam.UserGroupMembership(`${user.username}-groups`, {
            user: iamUser.name,
            groups: user.groups
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
    // Collect all roles the user should be able to assume
    const rolesToAssume = new Set<string>();

    // Add explicitly assigned roles
    if (user.assumeRoles) {
        user.assumeRoles.forEach(role => rolesToAssume.add(role));
    }

    // Create assume role policies for all roles
    for (const roleName of rolesToAssume) {
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
// AWS Accounts
// Create accounts in respective OUs
// =========================================

// Create accounts from config
const accounts = new Map();
for (const [ouName, ouAccounts] of Object.entries(accountsConfig)) {
    for (const accountConfig of ouAccounts) {
        const account = new aws.organizations.Account(`${accountConfig.name}-account`, {
            email: accountConfig.email,
            name: accountConfig.name,
            parentId: organizationalUnits.get(ouName)?.id,
            roleName: "OrganizationAccountAccessRole"
        });
        accounts.set(accountConfig.name, account);
    }
}

// =========================================
// Operational Data in SSM
// Store important operational values
// =========================================

// Store organization details
new aws.ssm.Parameter("organization-details", {
    name: "/organization/details",
    type: "SecureString",
    value: pulumi.output(organization).apply(org => 
        JSON.stringify({
            id: org.id,
            rootId: org.roots[0].id,
            arn: org.arn
        })
    ),
    tags: {
        ManagedBy: "Pulumi",
        Component: "Organization"
    }
});

// Store account details
new aws.ssm.Parameter("account-details", {
    name: "/organization/accounts",
    type: "SecureString",
    value: pulumi.output(accounts).apply(accs => 
        JSON.stringify(Object.fromEntries(
            Array.from(accs.entries()).map(([name, account]) => [
                name, 
                {
                    id: account.id,
                    arn: account.arn,
                    email: account.email
                }
            ])
        ))
    ),
    tags: {
        ManagedBy: "Pulumi",
        Component: "Accounts"
    }
});

// Store cross-account role details
new aws.ssm.Parameter("cross-account-roles", {
    name: "/organization/cross-account-roles",
    type: "SecureString",
    value: pulumi.output(roles).apply(rs => 
        JSON.stringify(Object.fromEntries(
            Array.from(rs.entries())
                .filter(([name]) => name.startsWith('cross-account-'))
                .map(([name, role]) => [
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
        Component: "CrossAccountRoles"
    }
});

// =========================================
// Stack Outputs
// Only export values needed for cross-stack references
// =========================================

export = {
    // Essential organization information
    organization: {
        id: organization.id,
        rootId: organization.roots[0].id,
        arn: organization.arn
    },

    // Cross-account access information (filtered)
    crossAccountAccess: {
        // Only export roles meant for cross-account access
        roles: pulumi.output(roles).apply(rs => 
            Object.fromEntries(
                Array.from(rs.entries())
                    .filter(([name]) => name.startsWith('cross-account-'))
                    .map(([name, role]) => [name, role.arn])
            )
        ),

        // Only export accounts that need to be referenced by other stacks
        accounts: pulumi.output(accounts).apply(accs =>
            Object.fromEntries(
                Array.from(accs.entries())
                    .filter(([name]) => name.startsWith('shared-'))
                    .map(([name, account]) => [name, {
                        id: account.id,
                        arn: account.arn
                    }])
            )
        )
    },

    // Export OU IDs only for those that need cross-stack references
    sharedOUs: pulumi.output(organizationalUnits).apply(ous =>
        Object.fromEntries(
            Array.from(ous.entries())
                .filter(([name]) => name.startsWith('shared-'))
                .map(([name, ou]) => [name, ou.id])
        )
    )
};

// Remove all other exports as they are now handled through SSM or stack outputs
