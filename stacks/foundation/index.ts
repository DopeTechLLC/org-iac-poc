/**
 * AWS Organization Foundation Stack
 * 
 * This stack creates the core AWS Organization infrastructure:
 * 1. AWS Organization
 * 2. Organizational Units (OUs)
 * 3. Service Control Policies (SCPs) and Tag Policies
 * 4. AWS Accounts in their respective OUs
 */

import { createOrganization } from "../../shared/org-library/organization";
import { createOrganizationalUnit } from "../../shared/org-library/organizationalUnit";
import { createPolicy } from "../../shared/org-library/policy";
import { PolicyType, SCPOptions, TagPolicyDocument, TagPolicyOptions } from "../../shared/org-library/policy/types";
import { Input, Output } from "@pulumi/pulumi";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Import configurations
import organizationConfig from "../../shared/config/organization";
import ouConfig from "../../shared/config/organizationalUnits";
import accountsConfig from "../../shared/config/accounts";

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
    type: PolicyType.SERVICE_CONTROL_POLICY,
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
    targetId: organizationalUnits.get("prod")?.id,
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
    type: PolicyType.SERVICE_CONTROL_POLICY,
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
    targetId: organizationalUnits.get("sandbox1")?.id,
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
    type: PolicyType.TAG_POLICY,
    document: {
        "tags": {
            "Environment": {
                "tag_value": {
                    "@@assign": ["prod", "staging", "sandbox"]
                }
            },
            "Owner": {
                "tag_value": {
                    "@@assign": ["*gmail.com"]
                }
            }
        }
    },
    targetId: organization.roots[0].id,
    tags: {
        Type: "TagPolicy",
        ManagedBy: "Pulumi",
    },
};

const productionSCP = createPolicy(productionSCPOptions);
const sandboxSCP = createPolicy(sandboxSCPOptions);
const resourceTagPolicy = createPolicy(tagPolicyOptions);

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
    value: pulumi.all(Array.from(accounts.entries())).apply(accountEntries => 
        JSON.stringify(Object.fromEntries(
            accountEntries.map(([name, account]) => [
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

// =========================================
// Stack Outputs
// Export values needed by environment stacks
// =========================================

export default {
    // Organization details
    organization: {
        id: organization.id,
        rootId: organization.roots[0].id,
        arn: organization.arn
    },
    
    // Export all OUs for reference by environment stacks
    organizationalUnits: pulumi.all(Array.from(organizationalUnits.entries())).apply(ouEntries =>
        Object.fromEntries(
            ouEntries.map(([name, ou]) => [
                name, 
                {
                    id: ou.id,
                    name: ou.name,
                    arn: ou.arn
                }
            ])
        )
    ),
    
    // Export all accounts for reference by environment stacks
    accounts: pulumi.all(Array.from(accounts.entries())).apply(accountEntries =>
        Object.fromEntries(
            accountEntries.map(([name, account]) => [
                name, 
                {
                    id: account.id,
                    arn: account.arn
                }
            ])
        )
    ),
    
    // Export SCPs and policies
    policies: {
        productionSCP: productionSCP.arn,
        sandboxSCP: sandboxSCP.arn,
        resourceTagPolicy: resourceTagPolicy.arn
    }
}; 