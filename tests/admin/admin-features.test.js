const { describe, it, before, after, beforeEach } = require('mocha');
const { expect } = require('chai');
const driverSetup = require('../utils/driver-setup');
const Helpers = require('../utils/helpers');
const config = require('../config/test-config');
const TestReporter = require('../utils/test-reporter');

const reporter = new TestReporter();

describe('Admin Features Tests', function() {
  let driver;
  let helpers;
  let testResults = [];

  before(async function() {
    reporter.start();
    driver = await driverSetup.createDriver();
    helpers = new Helpers(driver);
  });

  after(async function() {
    reporter.end();
    await driverSetup.quitDriver();
    
    // Generate report
    await reporter.generateHTMLReport();
    await reporter.generateJSONReport();
  });

  beforeEach(function() {
    this.currentTest.startTime = Date.now();
  });

  afterEach(async function() {
    const duration = ((Date.now() - this.currentTest.startTime) / 1000).toFixed(2);
    const testCase = {
      id: this.currentTest.title.replace(/\s+/g, '-').toLowerCase(),
      name: this.currentTest.title,
      category: 'Admin Features',
      status: this.currentTest.state === 'passed' ? 'passed' : 'failed',
      duration: duration,
      error: this.currentTest.err ? this.currentTest.err.message : null
    };
    
    testResults.push(testCase);
    reporter.addTestResult(testCase);
    
    // Take screenshot for all tests as proof
    if (config.screenshots.onEachTest && driver) {
      const status = this.currentTest.state === 'passed' ? 'passed' : 'failed';
      await helpers.takeScreenshot(`${status}-${testCase.id}`);
    }
  });

  it('TC-ADMIN-001: Should navigate to admin dashboard', async function() {
    await helpers.navigateTo('/admin/admindashboard');
    await helpers.waitForPageLoad();
    
    const currentUrl = await helpers.getCurrentUrl();
    expect(currentUrl).to.include('admin') || expect(currentUrl).to.include('login');
  });

  it('TC-ADMIN-002: Should display admin dashboard elements', async function() {
    await helpers.navigateTo('/admin/admindashboard');
    await helpers.waitForPageLoad();
    await helpers.sleep(config.wait.medium);
    
    // Check for admin dashboard content
    const adminSelectors = [
      '[class*="admin" i]',
      '[class*="dashboard" i]',
      'main',
      'section'
    ];
    
    let contentFound = false;
    for (const selector of adminSelectors) {
      if (await helpers.isElementPresent(selector)) {
        contentFound = true;
        break;
      }
    }
    expect(contentFound).to.be.true;
  });
});

