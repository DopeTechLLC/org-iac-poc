import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";

/**
 * Simple configuration options for basic authentication
 */
interface SimpleIdentityProviderOptions {
    name: string;
    allowEmailSignUp?: boolean;
    minimumPasswordLength?: number;
    tags?: { [key: string]: Input<string> };
}

/**
 * Result type for simple authentication setup
 */
interface SimpleIdentityProviderResult {
    userPool: aws.cognito.UserPool;
    client: aws.cognito.UserPoolClient;
}

/**
 * Creates a simple identity provider with basic username/password authentication.
 * This is a minimal setup focused on ease of use while maintaining security.
 * 
 * @param options - Basic configuration options
 * @returns The created Cognito resources
 */
export function createSimpleIdentityProvider(
    options: SimpleIdentityProviderOptions
): SimpleIdentityProviderResult {
    const {
        name,
        allowEmailSignUp = true,
        minimumPasswordLength = 8,
        tags = {}
    } = options;

    // Create a basic user pool with minimal secure configuration
    const userPool = new aws.cognito.UserPool(name, {
        name,
        
        // Use email as username for simplicity
        usernameAttributes: ["email"],
        
        // Basic but secure password policy
        passwordPolicy: {
            minimumLength: minimumPasswordLength,
            requireLowercase: true,
            requireNumbers: true,
            requireUppercase: true,
            temporaryPasswordValidityDays: 7,
        },

        // Basic email verification
        verificationMessageTemplate: {
            defaultEmailOption: "CONFIRM_WITH_CODE",
            emailSubject: "Your verification code",
            emailMessage: "Your verification code is {####}",
        },

        // Control whether users can sign up themselves
        adminCreateUserConfig: {
            allowAdminCreateUserOnly: !allowEmailSignUp,
        },

        // Enable basic email notifications
        emailConfiguration: {
            emailSendingAccount: "COGNITO_DEFAULT"
        },

        tags: {
            ...tags,
            ManagedBy: "pulumi",
            Type: "simple-auth"
        }
    });

    // Create a client app with basic auth flows
    const client = new aws.cognito.UserPoolClient(`${name}-client`, {
        userPoolId: userPool.id,
        name: `${name}-client`,
        
        // Enable basic authentication flows
        explicitAuthFlows: [
            "ALLOW_USER_SRP_AUTH",           // Secure Remote Password protocol
            "ALLOW_REFRESH_TOKEN_AUTH",       // Allow refresh tokens
            "ALLOW_USER_PASSWORD_AUTH"        // Allow basic password auth
        ],

        // Prevent generating client secret for simple web/mobile apps
        generateSecret: false,

        // No token revocation by default
        enableTokenRevocation: true,

        // Standard token validity
        refreshTokenValidity: 30,            // 30 days
        accessTokenValidity: 1,              // 1 hour
        idTokenValidity: 1,                  // 1 hour
    });

    return {
        userPool,
        client
    };
} 