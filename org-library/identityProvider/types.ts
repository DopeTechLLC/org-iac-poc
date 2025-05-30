import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";

/**
 * Options for createIdentityProvider.
 */
export type IdentityProviderOptions = aws.iam.SamlProviderArgs | aws.iam.OpenIdConnectProviderArgs;

/**
 * Return type for createIdentityProvider.
 */
export type IdentityProviderResult = aws.iam.SamlProvider | aws.iam.OpenIdConnectProvider; 