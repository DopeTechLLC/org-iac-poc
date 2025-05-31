import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";
import { 
  PolicyOptions, 
  PolicyResult, 
  SCPOptions, 
  TagPolicyOptions,
  PolicyType
} from "./types";

/**
 * Creates a standard IAM Policy.
 * 
 * @param options - Configuration options for the IAM Policy.
 * @returns The created Policy resource and its identifiers.
 */
export function createIamPolicy(options: PolicyOptions): PolicyResult {
  const { name, description, document, path, tags } = options;

  const policy = new aws.iam.Policy(name, {
    description,
    policy: document,
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
  const { name, description, enforceFor, requiredTags, allowedValues } = options;

  // Create tag policy document using Pulumi types
  let statements: aws.iam.PolicyStatement[] = [{
    Sid: "EnforceTagPresence",
    Effect: "Deny",
    Action: "*",
    Resource: "*",
    Condition: {
      "Null": requiredTags.reduce((acc, tag) => ({
        ...acc,
        [`aws:RequestTag/${tag}`]: "true"
      }), {})
    }
  }];

  // Add allowed values if specified
  if (allowedValues) {
    statements = [...statements, {
      Sid: "EnforceTagValues",
      Effect: "Deny",
      Action: "*",
      Resource: "*",
      Condition: {
        "ForAnyValue:StringNotLike": Object.entries(allowedValues).reduce(
          (acc, [tag, values]) => ({
            ...acc,
            [`aws:RequestTag/${tag}`]: values
          }), 
          {}
        )
      }
    }];
  }

  const tagPolicyDocument: aws.iam.PolicyDocument = {
    Version: "2012-10-17",
    Statement: statements
  };

  // Create the policy
  const policy = new aws.organizations.Policy(name, {
    content: JSON.stringify(tagPolicyDocument),
    description,
    name,
    type: "TAG_POLICY"
  });

  return {
    policy: policy as unknown as aws.iam.Policy,
    arn: policy.arn,
    id: policy.id
  };
}

/**
 * Creates a Permission Boundary Policy.
 * 
 * @param options - Configuration options for the Permission Boundary.
 * @returns The created Policy resource and its identifiers.
 */
export function createPermissionBoundary(options: PolicyOptions): PolicyResult {
  const { name, description, document, path, tags } = options;

  const policy = new aws.iam.Policy(name, {
    description,
    policy: document,
    path: path || "/permission-boundaries/",
    tags: {
      ...tags,
      Type: "PermissionBoundary",
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
      return createIamPolicy(options);
    case PolicyType.SCP:
      return createServiceControlPolicy(options as SCPOptions);
    case PolicyType.TAG:
      return createTagPolicy(options as TagPolicyOptions);
    case PolicyType.PERMISSION_BOUNDARY:
      return createPermissionBoundary(options);
    default:
      throw new Error(`Unsupported policy type: ${options.type}`);
  }
} 