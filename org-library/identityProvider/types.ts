import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";

/**
 * Common attributes for all identity providers
 */
export interface BaseIdentityProviderOptions {
  name: string;
  tags?: { [key: string]: string };
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
  allowedOauthFlows?: string[];
  allowedOauthScopes?: string[];
  callbackUrls?: string[];
  defaultRedirectUri?: string;
  generateSecret?: boolean;
  logoutUrls?: string[];
  supportedIdentityProviders?: string[];
}

/**
 * Options for Cognito User Pool
 */
export interface CognitoIdentityProviderOptions extends BaseIdentityProviderOptions {
  userPoolName?: string;
  schemas?: UserPoolSchemaConfig[];
  passwordPolicy?: {
    minimumLength?: number;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSymbols?: boolean;
    requireUppercase?: boolean;
    temporaryPasswordValidityDays?: number;
  };
  mfaConfiguration?: "OFF" | "ON" | "OPTIONAL";
  adminCreateUserConfig?: {
    allowAdminCreateUserOnly?: boolean;
    inviteMessageTemplate?: {
      emailMessage?: string;
      emailSubject?: string;
      smsMessage?: string;
    };
  };
  emailConfiguration?: {
    emailSendingAccount?: string;
    fromEmailAddress?: string;
    replyToEmailAddress?: string;
    sourceArn?: string;
  };
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
  clientIds: string[];
  thumbprintList: string[];
  assumeRoleArn?: string;
  assumeRolePolicy?: aws.iam.PolicyDocument;
}

/**
 * Result type for Google SSO setup
 */
export interface GoogleSSOResult {
  provider: aws.iam.OpenIdConnectProvider;
  role?: aws.iam.Role;
} 