"use strict";

const os = require("os");
const original = os.networkInterfaces.bind(os);

os.networkInterfaces = function networkInterfaces() {
  try {
    return original();
  } catch {
    return {};
  }
};
