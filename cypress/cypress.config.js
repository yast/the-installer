const { defineConfig } = require("cypress");

module.exports = defineConfig({
  defaultCommandTimeout: 15000,
  // better video quality for recording ("false" or range 0-51, the default is 32)
  videoCompression: 25,
  e2e: {
    // assume the D-Installer is running locally,
    // can be overridden by setting the CYPRESS_BASE_URL env. variable
    baseUrl: 'http://localhost:9090'
  }
});
