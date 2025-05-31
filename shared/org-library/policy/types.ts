import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";

/**
 * Types of policies supported by AWS Organizations
 * Uses the official AWS Organizations policy type strings
 */
export enum PolicyType {
    IAM = "IAM",
    SERVICE_CONTROL_POLICY = "SERVICE_CONTROL_POLICY", 
    TAG_POLICY = "TAG_POLICY"
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
 * Base options for all policy types
 */
export interface BasePolicyOptions {
    name: string;
    description?: string;
    path?: string;
    tags?: { [key: string]: Input<string> };
    environment?: PolicyEnvironment;
}

/**
 * Options for creating an IAM Policy
 */
export interface IAMPolicyOptions extends BasePolicyOptions {
    type: PolicyType.IAM;
    document: aws.iam.PolicyDocument;
}

/**
 * Options for Service Control Policies
 */
export interface SCPOptions extends BasePolicyOptions {
    type: PolicyType.SERVICE_CONTROL_POLICY;
    document: aws.iam.PolicyDocument;
    targetId: Input<string>;  // The Organization, OU, or Account ID to attach the policy to
}

/**
 * AWS Organizations Tag Policy document structure
 */
export interface TagPolicyDocument {
    tags: {
        [tagName: string]: {
            tag_key?: {
                "@@assign"?: string;
                "@@operators_allowed_for_child_policies"?: string[];
            };
            tag_value?: {
                "@@assign"?: string[];
                "@@allowlist"?: string[];
                "@@operators_allowed_for_child_policies"?: string[];
            };
            enforced_for?: {
                "@@assign"?: string[];
                "@@operators_allowed_for_child_policies"?: string[];
            };
        };
    };
}

/**
 * Options for Tag Policies
 */
export interface TagPolicyOptions extends BasePolicyOptions {
    type: PolicyType.TAG_POLICY;
    document: TagPolicyDocument;
    targetId?: Input<string>; // The Organization, OU, or Account ID to attach the policy to
}


/**
 * Union type for all policy options
 */
export type PolicyOptions = 
    | IAMPolicyOptions 
    | SCPOptions 
    | TagPolicyOptions

/**
 * Return type for policy creation functions
 */
export interface PolicyResult {
    policy: aws.iam.Policy | aws.organizations.Policy;
    arn: Input<string>;
    id: Input<string>;
    attachmentId?: Input<string>;  // For Organization policies that are attached
}