import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { OrgUnitOptions, OrgUnitResult } from "./types";

/**
 * Creates an AWS Organizational Unit within an existing Organization.
 *
 * @param options - Configuration options for the Organizational Unit.
 * @returns The created OrganizationalUnit resource.
 */
export function createOrganizationalUnit(
  options: OrgUnitOptions
): OrgUnitResult {
  const { name, parentId } = options;
  return new aws.organizations.OrganizationalUnit(name, {
    name,
    parentId,
  });
} 