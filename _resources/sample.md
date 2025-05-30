### src/aws/org/ouFactory.ts

```ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * Options for createOrganizationalUnit.
 */
export interface OrgUnitOptions {
  /** Name of the Organizational Unit (e.g., "dev", "staging", "prod"). */
  name: string;
  /** Parent ID (root or OU) under which this OU will be created. */
  parentId: pulumi.Input<string>;
}

/**
 * Return type for createOrganizationalUnit.
 */
export type OrgUnitResult = aws.organizations.OrganizationalUnit;

/**
 * Creates an AWS Organizational Unit within an existing Organization.
 *
 * @param options - Configuration options for the Organizational Unit.
 * @returns The created OrganizationalUnit resource.
 */
export function createOrganizationalUnit(
  options: OrgUnitOptions
): OrgUnitResult {
  const { name, parentId } = options;
  return new aws.organizations.OrganizationalUnit(name, {
    name,
    parentId,
  });
}
```

---

### src/aws/org/accountFactory.ts

```ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * Options for createAccount.
 */
export interface AccountOptions {
  /** Logical name for the AWS account resource. */
  name: string;
  /** Email address for the new AWS account. */
  email: string;
  /** Organizational Unit ID under which to place the account. */
  parentId: pulumi.Input<string>;
  /** IAM role name for cross-account access. Default: "OrganizationAccountAccessRole". */
  roleName?: string;
  /** Controls IAM users' billing permissions: "ALLOW" or "DENY". Default: "DENY". */
  billingAccess?: string;
}

/**
 * Return type for createAccount.
 */
export type AccountResult = aws.organizations.Account;

/**
 * Creates a member AWS Account in the Organization.
 *
 * @param options - Configuration options for the member account.
 * @returns The created Account resource.
 */
export function createAccount(
  options: AccountOptions
): AccountResult {
  const {
    name,
    email,
    parentId,
    roleName = "OrganizationAccountAccessRole",
    billingAccess = "DENY",
  } = options;

  return new aws.organizations.Account(name, {
    name,
    email,
    parentId,
    roleName,
    iamUserAccessToBilling: billingAccess,
  });
}
```

---

### src/aws/org/userFactory.ts

```ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * Options for createIamUser.
 */
export interface UserOptions {
  /** IAM username. */
  username: string;
  /** Initial console password. */
  password: pulumi.Input<string>;
  /** Force password reset on first login. Default: true. */
  requireReset?: boolean;
  /** List of IAM group names to attach user to. */
  groups?: string[];
  /** List of managed policy ARNs to attach directly to the user. */
  managedPolicies?: string[];
}[];
}

/**
 * Return type for createIamUser.
 */
export type UserResult = aws.iam.User;

/**
 * Creates an IAM User with console login profile, group memberships,
 * managed policy attachments, and inline policies.
 *
 * @param options - Configuration options for the IAM user.
 * @returns The created User resource.
 */
export function createIamUser(
  options: UserOptions
): UserResult {
  const {
    username,
    password,
    requireReset = true,
    groups = [],
    managedPolicies = [],
    inlinePolicies = [],
  } = options;

  // Create the IAM User
  const user = new aws.iam.User(username);

  // Create login profile for console access
  new aws.iam.UserLoginProfile(`${username}-login`, {
    user: user.name,
    password,
    passwordResetRequired: requireReset,
  });

  // Attach user to groups
  groups.forEach((group) => {
    new aws.iam.UserGroupMembership(`${username}-in-${group}`, {
      user: user.name,
      groups: [group],
    });
  });

  // Attach managed policies
  managedPolicies.forEach((policyArn) => {
    new aws.iam.UserPolicyAttachment(
      `${username}-attach-${policyArn.split('/').pop()}`,
      {
        user: user.name,
        policyArn,
      }
    );
  });

  // Create and attach inline policies
  inlinePolicies.forEach(({ name, policy }) => {
    new aws.iam.UserPolicy(
      `${username}-inline-${name}`,
      {
        user: user.name,
        name,
        policy,
      }
    );
  });

  return user;
}
```

---

### src/aws/org/factory.ts

```ts
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import {
  createOrganizationalUnit,
  OrgUnitOptions,
  OrgUnitResult,
} from "./ouFactory";
import { createAccount, AccountOptions, AccountResult } from "./accountFactory";
import { createIamUser, UserOptions, UserResult } from "./userFactory";

/**
 * Options for createAwsOrganization.
 */
export interface OrgOptions {
  /** Identifier for the Pulumi resource name. */
  name: string;
  /** Arguments for aws.organizations.Organization. */
  orgArgs: aws.organizations.OrganizationArgs;
  /** Configurations for Organizational Units. */
  ouConfigs: OrgUnitOptions[];
  /** Configurations for member AWS Accounts. */
  accountConfigs: AccountOptions[];
  /** Configurations for IAM Users. */
  userConfigs: UserOptions[];
}

/**
 * Return type for createAwsOrganization.
 */
export interface OrgResults {
  organization: aws.organizations.Organization;
  organizationalUnits: Record<string, OrgUnitResult>;
  accounts: AccountResult[];
  users: UserResult[];
}

/**
 * Orchestrates creation of an AWS Organization, its OUs, member accounts, and IAM users.
 *
 * @param options - Configuration object following OrgOptions.
 * @returns OrgResults containing all created resources.
 */
export function createAwsOrganization(
  options: OrgOptions
): OrgResults {
  const { name, orgArgs, ouConfigs, accountConfigs, userConfigs } = options;

  // Create the AWS Organization
  const organization = new aws.organizations.Organization(name, orgArgs);

  // Create Organizational Units
  const organizationalUnits: Record<string, OrgUnitResult> = {};
  ouConfigs.forEach((cfg) => {
    organizationalUnits[cfg.name] = createOrganizationalUnit(cfg);
  });

  // Create member accounts
  const accounts: AccountResult[] = accountConfigs.map((cfg) => createAccount(cfg));

  // Create IAM users
  const users: UserResult[] = userConfigs.map((cfg) => createIamUser(cfg));

  return { organization, organizationalUnits, accounts, users };
}
```

---

### src/aws/org/index.ts

````ts
export * from "./factory";
export * from "./ouFactory";
export * from "./accountFactory";
export * from "./userFactory";
export * from "./roleFactory";
export * from "./policyFactory";
export * from "./identityProviderFactory";
export * from "./groupFactory";
``` "./factory";
````

---

### README.md

````md
# AWS Organization Component

## Features
- Creates an AWS Organization with granular control via options.
- Defines Organizational Units, member accounts, and IAM users via configuration.

## Usage Example
```ts
import * as pulumi from "@pulumi/pulumi";
import { createAwsOrganization, OrgOptions } from "@your-org/cloudforge/aws/org";
import { createOrganizationalUnit } from "@your-org/cloudforge/aws/org/ouFactory";

const stack = pulumi.getStack();

// 1. Create the organization
const organization = createAwsOrganization({
  name: "my-org",
  orgArgs: {
    awsServiceAccessPrincipals: ["cloudtrail.amazonaws.com"],
    awsManagedPolicyTypes: ["SERVICE_CONTROL_POLICY"],
    featureSet: "ALL",
    iamUserAccessToBilling: "ALLOW",
  },
  ouConfigs: [], // We'll handle nested OUs manually below
  accountConfigs: [],
  userConfigs: [],
});

// 2. Compute the root ID
const rootId = organization.organization.roots.apply(r => r[0].id);

// 3. Create top-level OUs
const sandboxOu = createOrganizationalUnit({ name: "sandbox", parentId: rootId });
const testingOu = createOrganizationalUnit({ name: "testing", parentId: rootId });
const productionOu = createOrganizationalUnit({ name: "production", parentId: rootId });

// 4. Create nested OUs under sandbox
const devOu = createOrganizationalUnit({ name: "dev", parentId: sandboxOu.id });
const ephOu = createOrganizationalUnit({ name: "eph", parentId: sandboxOu.id });

// 5. Create nested OUs under testing
const stagingOu = createOrganizationalUnit({ name: "staging", parentId: testingOu.id });
const qaOu = createOrganizationalUnit({ name: "qa", parentId: testingOu.id });

// 6. Create nested OU under production
const prodOu = createOrganizationalUnit({ name: "prod", parentId: productionOu.id });
````

\$&

---

### src/aws/org/roleFactory.ts

```ts
import * as aws from "@pulumi/aws";
import type { Input } from "@pulumi/pulumi";

/**
 * Options for createIamRole.
 */
export interface RoleOptions {
  /** Logical name for the IAM Role resource. */
  name: string;
  /** Assume role policy document in JSON. */
  assumeRolePolicy: Input<string>;
  /** List of managed policy ARNs to attach to the role. */
  managedPolicyArns?: string[];
  /** Inline policies to attach. Map of policy name to JSON document. */
  inlinePolicies?: { name: string; policy: Input<string> }[];
}

/**
 * Return type for createIamRole.
 */
export type RoleResult = aws.iam.Role;

/**
 * Creates an IAM Role with an assume-role policy, managed, and inline policies.
 *
 * @param options - Configuration options for the IAM Role.
 * @returns The created Role resource.
 */
export function createIamRole(options: RoleOptions): RoleResult {
  const { name, assumeRolePolicy, managedPolicyArns = [], inlinePolicies = [] } = options;
  const role = new aws.iam.Role(name, { assumeRolePolicy });

  // Attach managed policies
  managedPolicyArns.forEach((arn) => {
    new aws.iam.RolePolicyAttachment(`${name}-attach-${arn.split('/').pop()}`, {
      role: role.name,
      policyArn: arn,
    });
  });

  // Create inline policies
  inlinePolicies.forEach(({ name: policyName, policy }) => {
    new aws.iam.RolePolicy(`${name}-inline-${policyName}`, {
      role: role.name,
      policy,
    });
  });

  return role;
}
```

---

### src/aws/org/policyFactory.ts

```ts
import * as aws from "@pulumi/aws";
import type { Input } from "@pulumi/pulumi";

/**
 * Options for createIamPolicy.
 */
export interface PolicyOptions {
  /** Logical name for the IAM Policy resource. */
  name: string;
  /** JSON policy document. */
  policy: Input<string>;
}

/**
 * Return type for createIamPolicy.
 */
export type PolicyResult = aws.iam.Policy;

/**
 * Creates a standalone IAM Policy.
 *
 * @param options - Configuration options for the IAM Policy.
 * @returns The created Policy resource.
 */
export function createIamPolicy(options: PolicyOptions): PolicyResult {
  const { name, policy } = options;
  return new aws.iam.Policy(name, { policy });
}
```

---

### src/aws/org/identityProviderFactory.ts

```ts
import * as aws from "@pulumi/aws";
import type { Input } from "@pulumi/pulumi";

/**
 * Options for createIdentityProvider.
 */
export interface IdentityProviderOptions {
  /** Logical name for the identity provider. */
  name: string;
  /** Type of provider (e.g., "SAML" | "OIDC"). */
  type: "SAML" | "OIDC";
  /** Provider details depending on type. */
  providerDetails: Record<string, any>;
  /** List of thumbprints (OIDC) or unused for SAML. */
  thumbprintList?: Input<string>[];
}

/**
 * Return type for createIdentityProvider.
 */
export type IdentityProviderResult = aws.iam.SamlProvider | aws.iam.OpenIdConnectProvider;

/**
 * Creates an IAM Identity Provider (SAML or OIDC).
 *
 * @param options - Configuration options for the Identity Provider.
 * @returns The created identity provider resource.
 */
export function createIdentityProvider(
  options: IdentityProviderOptions
): IdentityProviderResult {
  const { name, type, providerDetails, thumbprintList } = options;

  if (type === "SAML") {
    return new aws.iam.SamlProvider(name, {
      name,
      samlMetadataDocument: providerDetails.metadataDocument,
    });
  }

  return new aws.iam.OpenIdConnectProvider(name, {
    url: providerDetails.url,
    clientIdLists: providerDetails.clientIds,
    thumbprintLists: thumbprintList,
  });
}
```

---

### src/aws/org/groupFactory.ts

```ts
import * as aws from "@pulumi/aws";

/**
 * Options for createIamGroup.
 */
export interface GroupOptions {
  /** Logical name for the IAM Group resource. */
  name: string;
  /** Path for the group (default: "/"). */
  path?: string;
  /** Managed policy ARNs to attach to the group. */
  managedPolicyArns?: string[];
  /** Inline policies to attach. Map of policy name to JSON document. */
  inlinePolicies?: { name: string; policy: string }[];
}

/**
 * Return type for createIamGroup.
 */
export type GroupResult = aws.iam.Group;

/**
 * Creates an IAM Group with optional managed and inline policies.
 *
 * @param options - Configuration options for the IAM Group.
 * @returns The created Group resource.
 */
export function createIamGroup(
  options: GroupOptions
): GroupResult {
  const { name, path = "/", managedPolicyArns = [], inlinePolicies = [] } = options;

  // Create the IAM Group
  const group = new aws.iam.Group(name, { path });

  // Attach managed policies to the group
  managedPolicyArns.forEach((policyArn) => {
    new aws.iam.GroupPolicyAttachment(
      `${name}-attach-${policyArn.split("/").pop()}`,
      {
        group: group.name,
        policyArn,
      }
    );
  });

  // Create and attach inline policies
  inlinePolicies.forEach(({ name: policyName, policy }) => {
    new aws.iam.GroupPolicy(
      `${name}-inline-${policyName}`,
      {
        group: group.name,
        name: policyName,
        policy,
      }
    );
  });

  return group;
}
```

---

### src/aws/org/index.ts

```ts
export * from "./factory";
export * from "./ouFactory";
export * from "./accountFactory";
export * from "./userFactory";
export * from "./roleFactory";
export * from "./policyFactory";
export * from "./identityProviderFactory";
export * from "./groupFactory";
```

---

### README.md

````md
# AWS Organization Component

## Features
- Creates an AWS Organization with granular control via options.
- Defines Organizational Units, member accounts, IAM users, roles, policies, identity providers, and groups via configuration.

## Usage Example
```ts
import * as pulumi from "@pulumi/pulumi";
import { createAwsOrganization, OrgOptions } from "@your-org/cloudforge/aws/org";
import { createOrganizationalUnit } from "@your-org/cloudforge/aws/org/ouFactory";

(async () => {
  const stack = pulumi.getStack();

  // 1. Create the organization
  const organization = createAwsOrganization({
    name: "my-org",
    orgArgs: {
      awsServiceAccessPrincipals: ["cloudtrail.amazonaws.com"],
      awsManagedPolicyTypes: ["SERVICE_CONTROL_POLICY"],
      featureSet: "ALL",
      iamUserAccessToBilling: "ALLOW",
    },
    ouConfigs: [],
    accountConfigs: [],
    userConfigs: [],
  });

  // 2. Compute the root ID
  const rootId = await organization.organization.roots.apply(r => r[0].id);

  // 3. Create top-level and nested OUs as needed
  const sandboxOu = createOrganizationalUnit({ name: "sandbox", parentId: rootId });
  const devOu = createOrganizationalUnit({ name: "dev", parentId: sandboxOu.id });
})();
````

