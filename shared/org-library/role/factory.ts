import * as aws from "@pulumi/aws";
import { Input, output } from "@pulumi/pulumi";
import { RoleOptions, RoleResult } from "./types";

/**
 * Creates an IAM Role with an assume-role policy, managed, and inline policies.
 *
 * @param options - Configuration options for the IAM Role.
 * @returns The created Role resource.
 */
export function createIamRole(options: RoleOptions): RoleResult {
  const { assumeRolePolicy, managedPolicyArns = [], inlinePolicies = [], ...roleArgs } = options;

  // Create the role
  const role = new aws.iam.Role("role", {
    ...roleArgs,
    assumeRolePolicy: typeof assumeRolePolicy === 'string' 
      ? assumeRolePolicy 
      : JSON.stringify(assumeRolePolicy)
  });

  // Attach managed policies
  output(managedPolicyArns).apply(arns => {
    if (arns) {
      arns.forEach(arn => {
        if (arn) {
          new aws.iam.RolePolicyAttachment(`role-attach-${arn.split('/').pop()}`, {
            role: role.name,
            policyArn: arn,
          });
        }
      });
    }
  });

  // Create inline policies
  output(inlinePolicies).apply(policies => {
    if (policies) {
      policies.forEach(({ name: policyName, policy }) => {
        if (policyName && policy) {
          new aws.iam.RolePolicy(`role-inline-${policyName}`, {
            role: role.name,
            policy: typeof policy === 'string' ? policy : JSON.stringify(policy),
          });
        }
      });
    }
  });

  return role;
} 