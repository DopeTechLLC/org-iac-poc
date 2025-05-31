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
import { Input } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import usersConfig from "./config/users";
import policiesConfig from "./config/policies";

// =========================================
// AWS Organization
// Create the root organization and OUs
// =========================================

// Create the root organization
const organization = createOrganization("dopetech-org", {
    awsServiceAccessPrincipals: [
        "cloudtrail.amazonaws.com",
        "config.amazonaws.com",
        "sso.amazonaws.com"
    ],
    enabledPolicyTypes: [
        "SERVICE_CONTROL_POLICY",
        "TAG_POLICY"
    ],
    featureSet: "ALL"
});

// Create Organizational Units
const productionOU = createOrganizationalUnit("production", {
    name: "Production",
    parentId: organization.roots[0].id,
    tags: {
        Environment: "Production",
        ManagedBy: "Pulumi",
        Team: "Platform"
    }
});

const stagingOU = createOrganizationalUnit("staging", {
    name: "Staging",
    parentId: organization.roots[0].id,
    tags: {
        Environment: "Staging",
        ManagedBy: "Pulumi",
        Team: "Platform"
    }
});

const sandboxOU = createOrganizationalUnit("sandbox", {
    name: "Sandbox",
    parentId: organization.roots[0].id,
    tags: {
        Environment: "Sandbox",
        ManagedBy: "Pulumi",
        Team: "Platform"
    }
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
    targetId: productionOU.id,
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
    targetId: sandboxOU.id,
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

// Create production policies
const prodPolicies = new Map();
for (const policy of policiesConfig.prod || []) {
    const result = createPolicy({
        name: policy.name,
        type: PolicyType.IAM,
        environment: PolicyEnvironment.PROD,
        description: `Production environment policy: ${policy.name}`,
        document: {
            Version: "2012-10-17" as const,
            Statement: policy.document.Statement.map(stmt => ({
                ...stmt,
                Effect: stmt.Effect as "Allow" | "Deny",
                Condition: stmt.Condition ? stmt.Condition as unknown as aws.iam.Conditions : undefined
            })) as aws.iam.PolicyStatement[]
        },
        path: "/env/prod/",
        tags: {
            Environment: "prod",
            ManagedBy: "pulumi"
        }
    });
    prodPolicies.set(policy.name, result);
}

// Create staging policies
const stagingPolicies = new Map();
for (const policy of policiesConfig.staging || []) {
    const result = createPolicy({
        name: policy.name,
        type: PolicyType.IAM,
        environment: PolicyEnvironment.STAGING,
        description: `Staging environment policy: ${policy.name}`,
        document: {
            Version: "2012-10-17" as const,
            Statement: policy.document.Statement.map(stmt => ({
                ...stmt,
                Effect: stmt.Effect as "Allow" | "Deny",
                Condition: stmt.Condition ? stmt.Condition as unknown as aws.iam.Conditions : undefined
            })) as aws.iam.PolicyStatement[]
        },
        path: "/env/staging/",
        tags: {
            Environment: "staging",
            ManagedBy: "pulumi"
        }
    });
    stagingPolicies.set(policy.name, result);
}

// Create sandbox policies
const sandboxPolicies = new Map();
for (const policy of policiesConfig.sandbox1 || []) {
    const result = createPolicy({
        name: policy.name,
        type: PolicyType.IAM,
        environment: PolicyEnvironment.SANDBOX1,
        description: `Sandbox environment policy: ${policy.name}`,
        document: {
            Version: "2012-10-17" as const,
            Statement: policy.document.Statement.map(stmt => ({
                ...stmt,
                Effect: stmt.Effect as "Allow" | "Deny",
                Condition: stmt.Condition ? stmt.Condition as unknown as aws.iam.Conditions : undefined
            })) as aws.iam.PolicyStatement[]
        },
        path: "/env/sandbox/",
        tags: {
            Environment: "sandbox",
            ManagedBy: "pulumi"
        }
    });
    sandboxPolicies.set(policy.name, result);
}

// =========================================
// IAM Groups
// Create groups and attach policies
// =========================================

// Extract unique groups from user configurations
const uniqueGroups = [...new Set(usersConfig.flatMap(user => user.groups))];
const groups = new Map();

// Create groups and attach relevant policies
for (const groupName of uniqueGroups) {
    const managedPolicyArns: string[] = [];
    
    // Determine which policies to attach based on group name
    if (groupName.startsWith('prod-')) {
        managedPolicyArns.push(prodPolicies.get('prod-restricted-access').arn);
    }
    if (groupName.startsWith('qa-')) {
        managedPolicyArns.push(stagingPolicies.get('staging-access').arn);
    }
    if (groupName.startsWith('sandbox1-')) {
        managedPolicyArns.push(sandboxPolicies.get('sandbox1-full-access').arn);
    }

    const group = createIamGroup(groupName, {
        path: "/groups/",
        managedPolicyArns
    });
    
    groups.set(groupName, group);
}

// =========================================
// IAM Users
// Create users and establish access
// =========================================

// Create users and establish their access patterns
for (const user of usersConfig) {
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

    // Create group memberships
    for (const groupName of user.groups) {
        new aws.iam.UserGroupMembership(`${user.username}-${groupName}`, {
            user: iamUser.name,
            groups: [groupName]
        });
    }

    // Attach managed policies if specified
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
}

// =========================================
// Exports
// Export resource ARNs and IDs
// =========================================

export const organizationId = organization.id;
export const organizationArn = organization.arn;
export const organizationalUnits = {
    production: productionOU.id,
    staging: stagingOU.id,
    sandbox: sandboxOU.id
};

export const managedPolicyArns = Object.fromEntries(
    Array.from(managedPolicies.entries()).map(([name, policy]) => [name, policy.arn])
);

export const environmentPolicyArns = {
    prod: Object.fromEntries(Array.from(prodPolicies.entries()).map(([name, policy]) => [name, policy.arn])),
    staging: Object.fromEntries(Array.from(stagingPolicies.entries()).map(([name, policy]) => [name, policy.arn])),
    sandbox: Object.fromEntries(Array.from(sandboxPolicies.entries()).map(([name, policy]) => [name, policy.arn]))
};

export const groupArns = Object.fromEntries(
    Array.from(groups.entries()).map(([name, group]) => [name, group.arn])
);
