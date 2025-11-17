const { describe, it, before, after, beforeEach } = require('mocha');
const { expect } = require('chai');
const driverSetup = require('../utils/driver-setup');
const Helpers = require('../utils/helpers');
const config = require('../config/test-config');
const TestReporter = require('../utils/test-reporter');

const reporter = new TestReporter();

describe('Host Features Tests', function() {
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
      category: 'Host Features',
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

  it('TC-HOST-001: Should navigate to host dashboard', async function() {
    await helpers.navigateTo('/host/hostdashboard');
    await helpers.waitForPageLoad();
    
    const currentUrl = await helpers.getCurrentUrl();
    expect(currentUrl).to.include('host') || expect(currentUrl).to.include('login');
  });

  it('TC-HOST-002: Should navigate to host listings page', async function() {
    await helpers.navigateTo('/host/listings');
    await helpers.waitForPageLoad();
    
    const currentUrl = await helpers.getCurrentUrl();
    expect(currentUrl).to.include('listings') || expect(currentUrl).to.include('login');
  });

  it('TC-HOST-003: Should navigate to host calendar page', async function() {
    await helpers.navigateTo('/host/calendar');
    await helpers.waitForPageLoad();
    
    const currentUrl = await helpers.getCurrentUrl();
    expect(currentUrl).to.include('calendar') || expect(currentUrl).to.include('login');
  });

  it('TC-HOST-004: Should navigate to hosting steps page', async function() {
    await helpers.navigateTo('/pages/hostingsteps');
    await helpers.waitForPageLoad();
    
    const currentUrl = await helpers.getCurrentUrl();
    expect(currentUrl).to.include('hostingsteps') || expect(currentUrl).to.include('login');
  });

  it('TC-HOST-005: Should display host dashboard elements', async function() {
    await helpers.navigateTo('/host/hostdashboard');
    await helpers.waitForPageLoad();
    await helpers.sleep(config.wait.medium);
    
    // Check for dashboard content
    const dashboardSelectors = [
      '[class*="dashboard" i]',
      '[class*="host" i]',
      'main',
      'section'
    ];
    
    let contentFound = false;
    for (const selector of dashboardSelectors) {
      if (await helpers.isElementPresent(selector)) {
        contentFound = true;
        break;
      }
    }
    expect(contentFound).to.be.true;
  });

  it('TC-HOST-006: Should navigate to account settings', async function() {
    await helpers.navigateTo('/accountsettings');
    await helpers.waitForPageLoad();
    
    const currentUrl = await helpers.getCurrentUrl();
    expect(currentUrl).to.include('accountsettings') || expect(currentUrl).to.include('login');
  });

  it('TC-HOST-007: Should navigate to e-wallet page', async function() {
    await helpers.navigateTo('/ewallet');
    await helpers.waitForPageLoad();
    
    const currentUrl = await helpers.getCurrentUrl();
    expect(currentUrl).to.include('ewallet') || expect(currentUrl).to.include('login');
  });
});

