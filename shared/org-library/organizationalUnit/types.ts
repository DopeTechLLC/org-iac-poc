import * as aws from "@pulumi/aws";

/**
 * Options for createOrganizationalUnit.
 */
export type OrgUnitOptions = aws.organizations.OrganizationalUnitArgs;

/**
 * Return type for createOrganizationalUnit.
 */
export type OrgUnitResult = aws.organizations.OrganizationalUnit; 