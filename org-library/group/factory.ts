import * as aws from "@pulumi/aws";
import { GroupOptions, GroupResult } from "./types";

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