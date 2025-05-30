/**
 * Groups configuration
 *
 * This file defines IAM groups and their intended permissions.
 */

const groupsConfig = [
  {
    name: "admin",
    description: "Admin group with full access to QA OU."
  },
  {
    name: "sandbox1-limited",
    description: "Limited access group for sandbox1 OU."
  },
  {
    name: "org-everyone",
    description: "Group for all users in the organization."
  }
];

export default groupsConfig; 