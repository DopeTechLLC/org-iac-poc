import * as aws from "@pulumi/aws";

/**
 * Options for createIamRole.
 */
export type RoleOptions = aws.iam.RoleArgs;

/**
 * Return type for createIamRole.
 */
export type RoleResult = aws.iam.Role; 