/**
 * Main entry point for Pulumi stacks
 * 
 * This file dynamically exports the appropriate stack module based on the
 * currently selected stack.
 */

import * as pulumi from "@pulumi/pulumi";

// Get the current stack name
const stackName = pulumi.getStack();

// Export the appropriate stack module based on the stack name
let stackExports;

switch (stackName) {
  case "foundation":
    stackExports = require("./stacks/foundation");
    break;
  case "dev":
    stackExports = require("./stacks/environments/dev");
    break;
  case "staging":
    stackExports = require("./stacks/environments/staging");
    break;
  case "prod":
    stackExports = require("./stacks/environments/prod");
    break;
  default:
    throw new Error(`Unknown stack: ${stackName}`);
}

// Export the stack module
export default stackExports.default || stackExports; 