/**
 * Organization configuration
 *
 * This file defines the root AWS Organization settings.
 */

const organizationConfig = {
  // Logical name for the Organization resource
  name: "root-org",
  // Organization arguments (see Pulumi aws.organizations.OrganizationArgs)
  orgArgs: {
    awsServiceAccessPrincipals: [
      "cloudtrail.amazonaws.com",
      "config.amazonaws.com",
      "ram.amazonaws.com",
      "tagpolicies.tag.amazonaws.com",
      "ipam.amazonaws.com",
      "sso.amazonaws.com"
    ],
    awsManagedPolicyTypes: [
      "SERVICE_CONTROL_POLICY",
      "TAG_POLICY"
    ],
    featureSet: "ALL"
  }
};

export default organizationConfig; 