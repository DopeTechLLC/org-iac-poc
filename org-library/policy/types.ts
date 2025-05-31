import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";

/**
 * Represents a policy document statement
 */
export interface PolicyStatement {
  Sid?: string;
  Effect: "Allow" | "Deny";
  Action: string | string[];
  NotAction?: string | string[];
  Resource: string | string[];
  Condition?: Record<string, Record<string, any>>;
}

/**
 * Represents a policy document
 */
export interface PolicyDocument {
  Version: string;
  Statement: PolicyStatement[];
}

/**
 * Types of policies supported
 */
export enum PolicyType {
  IAM = "iam",
  SCP = "scp",
  TAG = "tag",
  PERMISSION_BOUNDARY = "permission_boundary"
}

/**
 * Environment types for policies
 */
export enum PolicyEnvironment {
  PROD = "prod",
  STAGING = "staging",
  SANDBOX1 = "sandbox1",
  SANDBOX2 = "sandbox2",
  DEV = "dev"
}

/**
 * Enhanced options for creating an IAM Policy
 */
export interface PolicyOptions {
  name: string;
  description?: string;
  type: PolicyType;
  environment?: PolicyEnvironment;
  document: PolicyDocument;
  path?: string;
  tags?: { [key: string]: string };
}

/**
 * Options specific to Service Control Policies
 */
export interface SCPOptions extends Omit<PolicyOptions, 'type'> {
  type: PolicyType.SCP;
  targetId: string;  // The Organization, OU, or Account ID to attach the policy to
}

/**
 * Options specific to Tag Policies
 */
export interface TagPolicyOptions extends Omit<PolicyOptions, 'type'> {
  type: PolicyType.TAG;
  enforceFor: string[];  // List of resource types to enforce tags on
  requiredTags: string[];  // List of required tag keys
  allowedValues?: Record<string, string[]>;  // Allowed values for specific tags
}

/**
 * Return type for policy creation functions
 */
export interface PolicyResult {
  policy: aws.iam.Policy;
  arn: Input<string>;
  id: Input<string>;
  attachmentId?: Input<string>;  // For SCPs and other attachable policies
} 