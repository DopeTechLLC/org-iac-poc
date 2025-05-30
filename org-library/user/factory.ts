import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { UserOptions, UserResult } from "./types";

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