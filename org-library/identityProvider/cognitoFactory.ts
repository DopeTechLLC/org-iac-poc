import * as aws from "@pulumi/aws";
import { CognitoIdentityProviderOptions, CognitoProviderResult } from "./types";

/**
 * Creates a Cognito User Pool with client app.
 *
 * @param options - Configuration options for the Cognito setup.
 * @returns The created Cognito resources.
 */
export function createCognitoProvider(
  options: CognitoIdentityProviderOptions
): CognitoProviderResult {
  const {
    name,
    userPoolName,
    schemas,
    passwordPolicy,
    mfaConfiguration = "OFF",
    adminCreateUserConfig,
    emailConfiguration,
    clientConfig,
    tags = {}
  } = options;

  // Create the User Pool with required configuration
  const userPool = new aws.cognito.UserPool(name, {
    name: userPoolName || name,
    schemas: schemas?.map(schema => ({
      ...schema,
      attributeDataType: schema.attributeDataType.toUpperCase()
    })),
    passwordPolicy,
    mfaConfiguration,
    adminCreateUserConfig,
    emailConfiguration,
    tags: {
      ...tags,
      ManagedBy: "pulumi"
    }
  });

  // Create the client app with default or provided configuration
  const clientName = `${name}-client`;
  const client = new aws.cognito.UserPoolClient(clientName, {
    userPoolId: userPool.id,
    name: clientName,
    generateSecret: clientConfig?.generateSecret ?? false,
    explicitAuthFlows: [
      "ALLOW_USER_SRP_AUTH",
      "ALLOW_REFRESH_TOKEN_AUTH"
    ],
    allowedOauthFlows: clientConfig?.allowedOauthFlows ?? ["code"],
    allowedOauthScopes: clientConfig?.allowedOauthScopes ?? ["openid", "email", "profile"],
    callbackUrls: clientConfig?.callbackUrls,
    logoutUrls: clientConfig?.logoutUrls,
    defaultRedirectUri: clientConfig?.defaultRedirectUri,
    supportedIdentityProviders: clientConfig?.supportedIdentityProviders ?? ["COGNITO"]
  });

  return {
    userPool,
    client
  };
} 