// Test Configuration
module.exports = {
  // Application URL - Use production URL by default
  baseUrl: process.env.BASE_URL || process.env.PRODUCTION_URL || 'https://getaways-official.firebaseapp.com',
  
  // Production URL (if testing production)
  productionUrl: process.env.PRODUCTION_URL || 'https://getaways-official.firebaseapp.com',
  
  // Browser Configuration
  browser: process.env.BROWSER || 'chrome', // chrome, firefox, edge
  
  // Headless mode
  headless: process.env.HEADLESS === 'true' || false,
  
  // Timeouts (in milliseconds)
  timeouts: {
    implicit: 10000,
    pageLoad: 30000,
    script: 30000,
    element: 10000
  },
  
      // Test Data
      testUsers: {
        guest: {
          email: process.env.GUEST_EMAIL || 'angelinefloresdeguzman@gmail.com',
          password: process.env.GUEST_PASSWORD || 'asdf1234!',
          firstName: 'Angeline',
          lastName: 'Flores de Guzman'
        },
        host: {
          email: process.env.HOST_EMAIL || 'angelinefloresdeguzman@gmail.com',
          password: process.env.HOST_PASSWORD || 'asdf1234!',
          firstName: 'Angeline',
          lastName: 'Flores de Guzman'
        },
        admin: {
          email: process.env.ADMIN_EMAIL || 'angelinefloresdeguzman@gmail.com',
          password: process.env.ADMIN_PASSWORD || 'asdf1234!',
          firstName: 'Angeline',
          lastName: 'Flores de Guzman'
        }
      },
  
  // Screenshot settings
  screenshots: {
    enabled: true,
    path: './test-results/screenshots/',
    onFailure: true,
    onSuccess: true, // Enable screenshots for all tests as proof
    onEachTest: true // Take screenshot for each test
  },
  
  // Report settings
  reports: {
    path: './test-results/reports/',
    format: 'html', // html, json, xml
    includeScreenshots: true
  },
  
  // Wait settings
  wait: {
    short: 2000,
    medium: 5000,
    long: 10000
  }
};

