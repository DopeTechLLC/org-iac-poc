/**
 * Roles configuration
 *
 * This file defines IAM roles for each OU and their permissions.
 */

const rolesConfig = {
  prod: [
    {
      name: "prod-system-role",
      description: "Role for system resources in prod OU. No user access.",
      policyArns: ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
    }
  ],
  qa: [
    {
      name: "qa-admin-role",
      description: "Admin role for QA OU.",
      policyArns: ["arn:aws:iam::aws:policy/AdministratorAccess"]
    }
  ],
  sandbox1: [
    {
      name: "sandbox1-limited-role",
      description: "Limited access role for sandbox1 OU.",
      policyArns: ["arn:aws:iam::aws:policy/PowerUserAccess"]
    }
  ],
  sandbox2: [
    {
      name: "sandbox2-everyone-role",
      description: "Open access role for sandbox2 OU.",
      policyArns: ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
    }
  ]
};

export default rolesConfig; 