/**
 * Policies configuration
 *
 * This file defines custom IAM policies for OUs if needed.
 */

const policiesConfig = {
  // Example: custom policy for sandbox1
  sandbox1: [
    {
      name: "sandbox1-custom-policy",
      document: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:ListBucket"],
            Resource: "*"
          }
        ]
      }
    }
  ]
};

export default policiesConfig; 