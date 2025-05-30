import * as aws from "@pulumi/aws";

/**
 * Options for createAccount.
 */
export type AccountOptions = aws.organizations.AccountArgs;

/**
 * Return type for createAccount.
 */
export type AccountResult = aws.organizations.Account; 