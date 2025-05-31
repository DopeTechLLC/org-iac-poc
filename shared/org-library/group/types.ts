import * as aws from "@pulumi/aws";
import { Input } from "@pulumi/pulumi";

/**
 * Options for createIamGroup.
 * Only supports managed policy attachments as inline policies are considered a bad practice.
 */
export interface GroupOptions extends Omit<aws.iam.GroupArgs, 'name'> {
    managedPolicyArns?: Input<string>[];
}

/**
 * Return type for createIamGroup.
 */
export type GroupResult = aws.iam.Group; 