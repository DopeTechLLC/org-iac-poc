import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";
import { 
  PolicyOptions, 
  PolicyResult, 
  SCPOptions, 
  TagPolicyOptions,
  PolicyType,
  IAMPolicyOptions
} from "./types";

/**
 * Creates a standard IAM Policy.
 * 
 * @param options - Configuration options for the IAM Policy.
 * @returns The created Policy resource and its identifiers.
 */
export function createIamPolicy(options: IAMPolicyOptions): PolicyResult {
  const { name, description, document, path, tags } = options;

  const policy = new aws.iam.Policy(name, {
    description,
    policy: JSON.stringify(document),
    path,
    tags: {
      ...tags,
      Environment: options.environment || "default",
      ManagedBy: "pulumi"
    }
  });

  return {
    policy,
    arn: policy.arn,
    id: policy.id
  };
}

/**
 * Creates a Service Control Policy and attaches it to the specified target.
 * 
 * @param options - Configuration options for the SCP.
 * @returns The created Policy resource and attachment details.
 */
export function createServiceControlPolicy(options: SCPOptions): PolicyResult {
  const { name, description, document, targetId } = options;

  // Create the policy
  const policy = new aws.organizations.Policy(name, {
    content: JSON.stringify(document),
    description,
    name,
    type: "SERVICE_CONTROL_POLICY"
  });

  // Attach the policy to the target
  const attachment = new aws.organizations.PolicyAttachment(`${name}-attachment`, {
    policyId: policy.id,
    targetId: targetId
  });

  return {
    policy: policy as unknown as aws.iam.Policy, // Type cast for consistency
    arn: policy.arn,
    id: policy.id,
    attachmentId: attachment.id
  };
}

/**
 * Creates a Tag Policy and configures it for the organization.
 * 
 * @param options - Configuration options for the Tag Policy.
 * @returns The created Policy resource and its identifiers.
 */
export function createTagPolicy(options: TagPolicyOptions): PolicyResult {
  const { name, description, document, targetId } = options;

  // Create the policy with the correct AWS Organizations tag policy format
  const policy = new aws.organizations.Policy(name, {
    content: JSON.stringify(document),
    description,
    name,
    type: "TAG_POLICY"
  });

  // Attach the policy to the target if targetId is provided
  let attachment;
  if (targetId) {
    attachment = new aws.organizations.PolicyAttachment(`${name}-attachment`, {
      policyId: policy.id,
      targetId: targetId
    });
  }

  return {
    policy: policy as unknown as aws.iam.Policy, // Type cast for consistency
    arn: policy.arn,
    id: policy.id,
    attachmentId: attachment?.id
  };
}

/**
 * Factory function that creates a policy based on its type.
 * 
 * @param options - Configuration options for the policy.
 * @returns The created Policy resource and its identifiers.
 */
export function createPolicy(
  options: PolicyOptions & { type: PolicyType }
): PolicyResult {
  switch (options.type) {
    case PolicyType.IAM:
      return createIamPolicy(options as IAMPolicyOptions);
    case PolicyType.SERVICE_CONTROL_POLICY:
      return createServiceControlPolicy(options as SCPOptions);
    case PolicyType.TAG_POLICY:
      return createTagPolicy(options as TagPolicyOptions);
    default:
      const _exhaustiveCheck: never = options;
      throw new Error(`Unsupported policy type: ${(options as any).type}`);
  }
} 