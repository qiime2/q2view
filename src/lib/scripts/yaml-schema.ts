import yaml from "js-yaml";

// yaml.CORE_SCHEMA prevents a lot of type parsing (inlcuding dates) and leaves
// those values as strings instead which in much better for searching.
//
// This has the unfortunate side effect of not localizing the time to your
// local time zone
export default yaml.Schema.create(yaml.CORE_SCHEMA, [
  new yaml.Type("!no-provenance", {
    kind: "scalar",
    resolve: (data) =>
      data !== null &&
      /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data),
    construct: (data) => data,
  }),
  new yaml.Type("!ref", {
    kind: "scalar",
    resolve: (data) => data !== null,
    construct: (data) => {
      // Data will be of form environment:plugins:<plugin>
      const plugin = data.split(":")[2];
      return `q2-${plugin}`;
    },
  }),
  new yaml.Type("!metadata", {
    kind: "scalar",
    resolve: (data) => data !== null,
    construct: (data) => {
      const splitData = data.split(":");
      if (splitData.length === 1) {
        return { file: data, artifacts: [] };
      }
      return { file: splitData[1], artifacts: splitData[0].split(",") };
    },
  }),
  new yaml.Type("!color", {
    kind: "scalar",
    resolve: (data) => data !== null,
    construct: (data) => data,
  }),
  new yaml.Type("!set", {
    kind: "sequence",
    resolve: (data) => data !== null,
    construct: (data) => data,
  }),
  new yaml.Type("!cite", {
    kind: "scalar",
    resolve: (data) => data !== null,
    construct: (data) => data,
  }),
]);
