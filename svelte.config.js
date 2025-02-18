import sw_config from "./sw-config.js";
import vend_config from "./vend-config.js";

let config;

if (process.env.VENDORED) {
  config = vend_config;
} else {
  config = sw_config;
}

export default config;
