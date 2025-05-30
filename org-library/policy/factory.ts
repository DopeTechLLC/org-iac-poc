import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";
import { PolicyOptions, PolicyResult } from "./types";

/**
 * Creates a standalone IAM Policy.
 *
 * @param options - Configuration options for the IAM Policy.
 * @returns The created Policy resource.
 */
export function createIamPolicy(options: PolicyOptions): PolicyResult {
  const { name, policy } = options;
  return new aws.iam.Policy(name, { policy });
} 