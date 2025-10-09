import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    video: false,
    retries: 1,
    defaultCommandTimeout: 8000,
    requestTimeout: 10000,
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
  },
});

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/commands.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
