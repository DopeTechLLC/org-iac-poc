import * as aws from "@pulumi/aws";

/**
 * Options for createIamGroup.
 */
export type GroupOptions = aws.iam.GroupArgs;

/**
 * Return type for createIamGroup.
 */
export type GroupResult = aws.iam.Group; 