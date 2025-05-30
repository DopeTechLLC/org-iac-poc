import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { AccountOptions, AccountResult } from "./types";

/**
 * Creates a member AWS Account in the Organization.
 *
 * @param options - Configuration options for the member account.
 * @returns The created Account resource.
 */
export function createAccount(
  options: AccountOptions
): AccountResult {
  const {
    name,
    email,
    parentId,
    roleName = "OrganizationAccountAccessRole",
    billingAccess = "DENY",
  } = options;

  return new aws.organizations.Account(name, {
    name,
    email,
    parentId,
    roleName,
    iamUserAccessToBilling: billingAccess,
  });
} 