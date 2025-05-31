/**
 * Shared type definitions for configuration objects
 */

// Group configuration types
export interface GroupConfig {
    name: string;
    description: string;
    tags: {
        [key: string]: string | undefined;
        Environment: string;
    };
    environment: string;
}

// User configuration types
export interface UserConfig {
    username: string;
    email: string;
    description: string;
    groups?: string[];
    managedPolicies?: string[];
    assumeRoles?: string[];
    environment: string;
    tags: {
        [key: string]: string | undefined;
        Environment: string;
    };
}

// Role configuration types
export interface RoleConfig {
    name: string;
    description: string;
    policyArns: string[];
    tags: {
        [key: string]: string;
        Environment: string;
    };
}

// Policy configuration types
export interface PolicyDocument {
    Version: string;
    Statement: PolicyStatement[];
}

export interface PolicyStatement {
    Sid?: string;
    Effect: string;
    Action: string | string[];
    Resource: string | string[];
    Condition?: any;
}

export interface PolicyConfig {
    name: string;
    description?: string;
    document: PolicyDocument;
    tags?: {
        [key: string]: string;
    };
    environment?: string;
}

// Role configuration by environment
export interface RolesByEnvironment {
    prod: RoleConfig[];
    staging: RoleConfig[];
    dev: RoleConfig[];
    qa: RoleConfig[];
    sandbox1: RoleConfig[];
    sandbox2: RoleConfig[];
    [key: string]: RoleConfig[];
} 