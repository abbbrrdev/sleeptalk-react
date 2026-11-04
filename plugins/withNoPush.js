// Debt only uses local notifications — drop the Push entitlement expo-notifications adds.
// Listed first in app.config.ts so its entitlements mod runs last.
const { withEntitlementsPlist } = require("expo/config-plugins");
module.exports = function withNoPush(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults["aps-environment"];
    return c;
  });
};
