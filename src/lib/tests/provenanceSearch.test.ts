import { expect, test } from "vitest";
import BiMap from "$lib/scripts/biMap";
import { searchProvenance } from "$lib/scripts/provSearchUtils";
import provenanceModel from "$lib/models/provenanceModel";

const testJSON_1 = {
  uuid: "uuid1",
  "escap.ed": {
    "nest.ed": {
      "ke.y": "What a gross weird key",
    },
  },
  bool: {
    key: {
      false: false,
      true: true,
    },
  },
  numbers: {
    "1": {
      in: {
        "2": {
          key: 1000,
          foo: "foo this string ends in bar",
          bar: "bar this string ends in foo",
          acnhors: "^this string is bookended by anchors$",
          null: null,
        },
      },
    },
  },
};

// const testJSON_2 = {
//   uuid: "uuid2",
//   "escap.ed": {
//     "nest.ed": {
//       "ke.y": "What a gross weird key",
//     },
//   },
//   bool: {
//     key: {
//       false: false,
//       true: true,
//     },
//   },
//   numbers: {
//     "1": {
//       in: {
//         "2": {
//           key: 1000,
//           foo: "foo this string ends in bar",
//           bar: "bar this string ends in foo",
//           acnhors: "^this string is bookended by anchors$",
//           null: null,
//         },
//       },
//     },
//   },
// };

// const testJSON_3 = {
//   uuid: "uuid3",
//   "escap.ed": {
//     "nest.ed": {
//       "ke.y": "What a gross weird key",
//     },
//   },
//   bool: {
//     key: {
//       false: false,
//       true: true,
//     },
//   },
//   numbers: {
//     "1": {
//       in: {
//         "2": {
//           key: 2000,
//           foo: "foo this string ends in bar",
//           bar: "bar this string ends in foo",
//           acnhors: "^this string is bookended by anchors$",
//           null: null,
//         },
//       },
//     },
//   },
// };

const testMap = new BiMap(new Map([["uuid1", testJSON_1]])); //, ["uuid2", testJSON_2], ["uuid3", testJSON_3]]));
provenanceModel.nodeIDToJSON = testMap;

test("escaped key", () => {
  const hits = searchProvenance('escap.ed.nest.ed.ke.y: "What"');
  expect(hits.toString() == '["uuid1"]');
});

test("both anchors", () => {
  const hits = searchProvenance('numbers.1.in.2.foo: ("^foo" AND "bar$")');
  expect(hits.toString() == '["uuid1"]');
});
