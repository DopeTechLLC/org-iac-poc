import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";

/**
 * Common attributes for all identity providers
 */
export interface BaseIdentityProviderOptions {
  name: string;
  tags?: { [key: string]: Input<string> };
}

/**
 * Schema configuration for Cognito User Pool
 */
export interface UserPoolSchemaConfig {
  attributeDataType: string;
  name: string;
  required?: boolean;
  mutable?: boolean;
  stringAttributeConstraints?: {
    minLength?: string;
    maxLength?: string;
  };
}

/**
 * Client configuration for Cognito User Pool
 */
export interface UserPoolClientConfig {
  allowedOauthFlows?: Input<string[]>;
  allowedOauthScopes?: Input<string[]>;
  callbackUrls?: Input<string[]>;
  defaultRedirectUri?: Input<string>;
  generateSecret?: Input<boolean>;
  logoutUrls?: Input<string[]>;
  supportedIdentityProviders?: Input<string[]>;
  explicitAuthFlows?: Input<string[]>;
}

/**
 * Options for Cognito User Pool
 */
export interface CognitoIdentityProviderOptions extends BaseIdentityProviderOptions {
  userPoolName?: Input<string>;
  schemas?: Input<aws.types.input.cognito.UserPoolSchema>[];
  passwordPolicy?: Input<aws.types.input.cognito.UserPoolPasswordPolicy>;
  mfaConfiguration?: Input<"OFF" | "ON" | "OPTIONAL">;
  adminCreateUserConfig?: Input<aws.types.input.cognito.UserPoolAdminCreateUserConfig>;
  emailConfiguration?: Input<aws.types.input.cognito.UserPoolEmailConfiguration>;
  clientConfig?: UserPoolClientConfig;
}

/**
 * Result type for Cognito setup
 */
export interface CognitoProviderResult {
  userPool: aws.cognito.UserPool;
  client: aws.cognito.UserPoolClient;
}

/**
 * Options for Google SSO Provider
 */
export interface GoogleSSOProviderOptions extends BaseIdentityProviderOptions {
  clientIds: Input<string>[];
  thumbprintList: Input<string>[];
  assumeRoleArn?: Input<string>;
  assumeRolePolicy?: aws.iam.PolicyDocument;
}

/**
 * Result type for Google SSO setup
 */
export interface GoogleSSOResult {
  provider: aws.iam.OpenIdConnectProvider;
  role?: aws.iam.Role;
} 