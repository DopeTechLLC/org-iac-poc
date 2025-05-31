import * as aws from "@pulumi/aws";
import { UserOptions, UserResult } from "./types";

/**
 * Creates an IAM User.
 *
 * @param name - Logical name for the IAM user resource.
 * @param options - Configuration options for the IAM user.
 * @returns The created User resource.
 */
export function createIamUser(
  name: string,
  options: UserOptions
): UserResult {
  return new aws.iam.User(name, options);
} 