import * as aws from "@pulumi/aws";
import { OrgUnitOptions, OrgUnitResult } from "./types";

/**
 * Creates an AWS Organizational Unit within an existing Organization.
 *
 * @param name - Logical name for the Organizational Unit resource.
 * @param options - Configuration options for the Organizational Unit.
 * @returns The created OrganizationalUnit resource.
 */
export function createOrganizationalUnit(
  name: string,
  options: OrgUnitOptions
): OrgUnitResult {
  return new aws.organizations.OrganizationalUnit(name, options);
} 