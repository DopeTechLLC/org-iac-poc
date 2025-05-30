import * as aws from "@pulumi/aws";
import { OrganizationOptions, OrganizationResult } from "./types";

/**
 * Creates an AWS Organization root.
 *
 * @param name - Logical name for the Organization resource.
 * @param options - Configuration options for the Organization.
 * @returns The created Organization resource.
 */
export function createOrganization(
  name: string,
  options: OrganizationOptions
): OrganizationResult {
  return new aws.organizations.Organization(name, options);
} 