const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    // assume the D-Installer is running locally,
    // can be overridden by setting the CYPRESS_BASE_URL env. variable
    baseUrl: 'https://localhost:9090'
  }
});
