import * as aws from "@pulumi/aws";
import { OrganizationOptions, OrganizationResult } from "./types";

/**
 * Creates an AWS Organization root.
 *
 * @param options - Configuration options for the Organization.
 * @returns The created Organization resource.
 */
export function createOrganization(
  options: OrganizationOptions
): OrganizationResult {
  return new aws.organizations.Organization(options.name, options.orgArgs);
} 