/**
 * Identity Provider configuration
 *
 * This file defines a simple SAML or OIDC identity provider.
 */

const identityProviderConfig = {
  type: "OIDC", // or "SAML"
  name: "my-oidc-provider",
  providerDetails: {
    url: "https://example-oidc.com",
    clientIds: ["client-id-1", "client-id-2"]
  },
  thumbprintList: ["thumbprint1", "thumbprint2"]
};

export default identityProviderConfig; 