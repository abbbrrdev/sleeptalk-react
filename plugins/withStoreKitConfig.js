// Local purchase testing without App Store Connect: copies storekit/SleepTalk.storekit
// into ios/ on `expo prebuild` and attaches it to the Run action of the Xcode scheme.
// Only affects "Run" from Xcode (debug). Archive / TestFlight / App Store builds ignore it.
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const FILE = "SleepTalk.storekit";

module.exports = function withStoreKitConfig(config) {
  return withDangerousMod(config, [
    "ios",
    (c) => {
      const root = c.modRequest.projectRoot;
      const ios = c.modRequest.platformProjectRoot;
      const src = path.join(root, "storekit", FILE);
      if (!fs.existsSync(src)) return c;
      fs.copyFileSync(src, path.join(ios, FILE));

      const proj = fs.readdirSync(ios).find((f) => f.endsWith(".xcodeproj"));
      if (!proj) return c;
      const dir = path.join(ios, proj, "xcshareddata", "xcschemes");
      if (!fs.existsSync(dir)) return c;
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".xcscheme"))) {
        const p = path.join(dir, f);
        let xml = fs.readFileSync(p, "utf8");
        if (xml.includes("StoreKitConfigurationFileReference")) continue;
        // path is relative to the folder that contains the .xcodeproj (ios/)
        xml = xml.replace(
          /(<LaunchAction[\s\S]*?>)/,
          `$1\n      <StoreKitConfigurationFileReference\n         identifier = "../${FILE}">\n      </StoreKitConfigurationFileReference>`
        );
        fs.writeFileSync(p, xml);
      }
      return c;
    },
  ]);
};
