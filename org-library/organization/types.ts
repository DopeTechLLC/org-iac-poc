import * as aws from "@pulumi/aws";

/**
 * Options for createOrganization.
 */
export type OrganizationOptions = aws.organizations.OrganizationArgs;

/**
 * Return type for createOrganization.
 */
export type OrganizationResult = aws.organizations.Organization; 