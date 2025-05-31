/**
 * Policies configuration
 *
 * This file defines custom IAM policies and tag policies for the organization.
 * Includes:
 * - Environment-specific IAM policies
 * - Mandatory tagging policies
 * - Access control policies
 */

const policiesConfig = {
  // Managed Policies
  managedPolicies: [
    {
      name: "sandbox-environments-access",
      document: {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "Sandbox1Access",
            Effect: "Allow",
            Action: [
              "ec2:Describe*",
              "s3:List*",
              "s3:Get*",
              "dynamodb:List*",
              "dynamodb:Describe*",
              "lambda:List*",
              "lambda:Get*",
              "cloudwatch:Get*",
              "cloudwatch:List*"
            ],
            Resource: "*",
            Condition: {
              StringEquals: {
                "aws:ResourceTag/Environment": "sandbox1"
              }
            }
          },
          {
            Sid: "Sandbox2Access",
            Effect: "Allow",
            Action: [
              "ec2:Describe*",
              "s3:List*",
              "s3:Get*",
              "dynamodb:List*",
              "dynamodb:Describe*",
              "lambda:List*",
              "lambda:Get*",
              "cloudwatch:Get*",
              "cloudwatch:List*"
            ],
            Resource: "*",
            Condition: {
              StringEquals: {
                "aws:ResourceTag/Environment": "sandbox2"
              }
            }
          }
        ]
      }
    }
  ],

  // Tag Policy - Enforces mandatory tags across the organization
  tagPolicies: [
    {
      name: "mandatory-tags-policy",
      document: {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "RequireOwnerTag",
            Effect: "Deny",
            Action: [
              "ec2:RunInstances",
              "ec2:CreateVolume",
              "s3:CreateBucket",
              "rds:CreateDBInstance",
              "lambda:CreateFunction",
              "dynamodb:CreateTable",
              "sagemaker:CreateNotebookInstance",
              "eks:CreateCluster"
            ],
            Resource: "*",
            Condition: {
              "Null": {
                "aws:RequestTag/Owner": "true"
              }
            }
          },
          {
            Sid: "RequireEnvironmentTag",
            Effect: "Deny",
            Action: "*",
            Resource: "*",
            Condition: {
              "Null": {
                "aws:RequestTag/Environment": "true"
              }
            }
          },
          {
            Sid: "ValidateEnvironmentTagValues",
            Effect: "Deny",
            Action: "*",
            Resource: "*",
            Condition: {
              "ForAnyValue:StringNotLike": {
                "aws:RequestTag/Environment": ["prod", "staging", "dev", "sandbox"]
              }
            }
          },
          {
            Sid: "RequireCostCenterTag",
            Effect: "Deny",
            Action: "*",
            Resource: "*",
            Condition: {
              "Null": {
                "aws:RequestTag/CostCenter": "true"
              }
            }
          }
        ]
      }
    }
  ],

  // Production environment policies
  prod: [
    {
      name: "prod-restricted-access",
      document: {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "EnforceMFA",
            Effect: "Deny",
            NotAction: [
              "iam:CreateVirtualMFADevice",
              "iam:EnableMFADevice",
              "iam:GetUser",
              "iam:ListMFADevices",
              "iam:ListVirtualMFADevices",
              "iam:ResyncMFADevice"
            ],
            Resource: "*",
            Condition: {
              BoolIfExists: {
                "aws:MultiFactorAuthPresent": "false"
              }
            }
          },
          {
            Sid: "DenyDeletionOperations",
            Effect: "Deny",
            Action: [
              "*:Delete*",
              "*:Remove*",
              "s3:DeleteObject*",
              "ec2:TerminateInstances"
            ],
            Resource: "*",
            Condition: {
              StringNotLike: {
                "aws:PrincipalTag/Role": "ProductionAdmin"
              }
            }
          }
        ]
      }
    }
  ],

  // Staging environment policies
  staging: [
    {
      name: "staging-access",
      document: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "ec2:*",
              "rds:*",
              "s3:*",
              "lambda:*",
              "cloudwatch:*",
              "dynamodb:*",
              "iam:GetRole",
              "iam:GetPolicy",
              "iam:ListRoles",
              "iam:ListPolicies"
            ],
            Resource: "*",
            Condition: {
              StringEquals: {
                "aws:RequestedRegion": ["us-east-1", "us-west-2"]
              }
            }
          }
        ]
      }
    }
  ],

  // Sandbox environment policies
  sandbox1: [
    {
      name: "sandbox1-full-access",
      document: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "*",
            Resource: "*",
            Condition: {
              StringEquals: {
                "aws:PrincipalTag/Environment": "sandbox"
              }
            }
          },
          {
            Effect: "Deny",
            Action: [
              "organizations:*",
              "account:*",
              "iam:CreateUser",
              "iam:CreateRole",
              "iam:DeleteRole",
              "iam:DeleteUserPolicy",
              "iam:DeleteRolePolicy"
            ],
            Resource: "*"
          }
        ]
      }
    }
  ],

  // Developer policies
  developer: [
    {
      name: "developer-access",
      document: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "ec2:Describe*",
              "ec2:StartInstances",
              "ec2:StopInstances",
              "s3:*",
              "dynamodb:*",
              "lambda:*",
              "cloudwatch:*",
              "logs:*",
              "sns:*",
              "sqs:*"
            ],
            Resource: "*",
            Condition: {
              StringEquals: {
                "aws:RequestedRegion": ["us-east-1", "us-west-2"]
              }
            }
          }
        ]
      }
    }
  ]
};

export default policiesConfig; 