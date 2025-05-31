import * as aws from "@pulumi/aws";
import { GoogleSSOProviderOptions, GoogleSSOResult } from "./types";

/**
 * Creates a Google SSO identity provider with optional role configuration.
 *
 * @param options - Configuration options for the Google SSO setup.
 * @returns The created provider and role resources.
 */
export function createGoogleSSOProvider(
  options: GoogleSSOProviderOptions
): GoogleSSOResult {
  const {
    name,
    clientIds,
    thumbprintList,
    assumeRoleArn,
    assumeRolePolicy,
    tags = {}
  } = options;

  // Create the OIDC Provider
  const provider = new aws.iam.OpenIdConnectProvider(name, {
    url: "https://accounts.google.com",
    clientIdLists: clientIds,
    thumbprintLists: thumbprintList,
    tags: {
      ...tags,
      Provider: "Google",
      ManagedBy: "pulumi"
    }
  });

  // Create role if policy is specified
  let role: aws.iam.Role | undefined;
  if (assumeRolePolicy) {
    role = new aws.iam.Role(`${name}-role`, {
      name: `${name}-google-sso-role`,
      assumeRolePolicy,
      tags: {
        ...tags,
        Provider: "Google",
        ManagedBy: "pulumi"
      }
    });

    // Attach the role policy if ARN is provided
    if (assumeRoleArn) {
      new aws.iam.RolePolicyAttachment(`${name}-policy-attachment`, {
        role: role.name,
        policyArn: assumeRoleArn
      });
    }
  }

  return {
    provider,
    role
  };
} 