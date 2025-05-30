import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";
import { IdentityProviderOptions, IdentityProviderResult } from "./types";

/**
 * Creates an IAM Identity Provider (SAML or OIDC).
 *
 * @param options - Configuration options for the Identity Provider.
 * @returns The created identity provider resource.
 */
export function createIdentityProvider(
  options: IdentityProviderOptions
): IdentityProviderResult {
  const { name, type, providerDetails, thumbprintList } = options;

  if (type === "SAML") {
    return new aws.iam.SamlProvider(name, {
      name,
      samlMetadataDocument: providerDetails.metadataDocument,
    });
  }

  return new aws.iam.OpenIdConnectProvider(name, {
    url: providerDetails.url,
    clientIdLists: providerDetails.clientIds,
    thumbprintLists: thumbprintList,
  });
} 