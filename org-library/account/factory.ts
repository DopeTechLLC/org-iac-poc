import * as aws from "@pulumi/aws";
import { AccountOptions, AccountResult } from "./types";

/**
 * Creates a member AWS Account in the Organization.
 *
 * @param name - Logical name for the AWS account resource.
 * @param options - Configuration options for the member account.
 * @returns The created Account resource.
 */
export function createAccount(
  name: string,
  options: AccountOptions
): AccountResult {
  return new aws.organizations.Account(name, options);
} 