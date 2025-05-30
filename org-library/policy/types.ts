import * as aws from "@pulumi/aws";

/**
 * Options for createIamPolicy.
 */
export type PolicyOptions = aws.iam.PolicyArgs;

/**
 * Return type for createIamPolicy.
 */
export type PolicyResult = aws.iam.Policy; 