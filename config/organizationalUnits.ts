/**
 * Organizational Units configuration
 *
 * This file defines the hierarchy of OUs in the AWS Organization.
 */

const ouConfig = {
  // Top-level OUs
  dev: {
    name: "dev",
    // Nested OUs under dev
    children: {
      sandbox1: { name: "sandbox1" },
      sandbox2: { name: "sandbox2" }
    }
  },
  qa: { name: "qa" },
  prod: { name: "prod" }
};

export default ouConfig; 