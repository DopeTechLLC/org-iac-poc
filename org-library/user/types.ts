import * as aws from "@pulumi/aws";

/**
 * Options for createIamUser.
 */
export type UserOptions = aws.iam.UserArgs;

/**
 * Return type for createIamUser.
 */
export type UserResult = aws.iam.User; 