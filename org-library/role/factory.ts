import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";
import { RoleOptions, RoleResult } from "./types";

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