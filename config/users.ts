/**
 * Users configuration
 *
 * This file defines IAM users and their group memberships.
 */

const usersConfig = [
  {
    username: "admin-user",
    email: "admin@example.com",
    groups: ["admin"]
  },
  {
    username: "sandbox1-user1",
    email: "sandbox1-user1@example.com",
    groups: ["sandbox1-limited"]
  },
  {
    username: "sandbox1-user2",
    email: "sandbox1-user2@example.com",
    groups: ["sandbox1-limited"]
  }
];

export default usersConfig; 