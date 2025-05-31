import * as aws from "@pulumi/aws";
import { GroupOptions, GroupResult } from "./types";
import { Input, output } from "@pulumi/pulumi";

/**
 * Creates an IAM Group with optional managed policy attachments.
 * Note: Inline policies are not supported as they are considered a bad practice.
 * Use managed policies instead for better maintainability and reusability.
 *
 * @param name - Logical name for the IAM Group resource
 * @param options - Configuration options for the IAM Group
 * @returns The created Group resource
 */
export function createIamGroup(
    name: string,
    options: GroupOptions
): GroupResult {
    const { 
        path, 
        managedPolicyArns = [] as Input<string>[],
        ...groupArgs 
    } = options;

    // Create the IAM Group
    const group = new aws.iam.Group(name, { 
        path,
        ...groupArgs
    });

    // Attach managed policies to the group
    managedPolicyArns.forEach((policyArn: Input<string>) => {
        new aws.iam.GroupPolicyAttachment(
            `${name}-attach-${output(policyArn).apply(arn => arn.split("/").pop())}`,
            {
                group: group.name,
                policyArn,
            }
        );
    });

    return group;
} 