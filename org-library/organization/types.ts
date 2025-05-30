import * as aws from "@pulumi/aws";

/**
 * Options for createOrganization.
 */
export interface OrganizationOptions {
  /** Identifier for the Pulumi resource name. */
  name: string;
  /** Arguments for aws.organizations.Organization. */
  orgArgs: aws.organizations.OrganizationArgs;
}

/**
 * Return type for createOrganization.
 */
export type OrganizationResult = aws.organizations.Organization; 