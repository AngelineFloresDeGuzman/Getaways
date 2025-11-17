const { Builder, Capabilities } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const config = require('../config/test-config');

// Import chromedriver to ensure it's available
try {
  require('chromedriver');
} catch (e) {
  console.warn('ChromeDriver not found in node_modules, using system PATH');
}

class DriverSetup {
  constructor() {
    this.driver = null;
  }

  async createDriver() {
    const browser = config.browser.toLowerCase();
    const headless = config.headless;

    try {
      switch (browser) {
        case 'chrome':
          this.driver = await this.createChromeDriver(headless);
          break;
        case 'firefox':
          this.driver = await this.createFirefoxDriver(headless);
          break;
        case 'edge':
          this.driver = await this.createEdgeDriver(headless);
          break;
        default:
          throw new Error(`Unsupported browser: ${browser}`);
      }

      // Set timeouts
      await this.driver.manage().setTimeouts({
        implicit: config.timeouts.implicit,
        pageLoad: config.timeouts.pageLoad,
        script: config.timeouts.script
      });

      // Maximize window
      await this.driver.manage().window().maximize();

      return this.driver;
    } catch (error) {
      console.error('Error creating driver:', error);
      throw error;
    }
  }

  async createChromeDriver(headless) {
    const options = new chrome.Options();
    
    if (headless) {
      options.addArguments('--headless=new');
    }
    
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-software-rasterizer');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.excludeSwitches('enable-logging');
    
    return new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  }

  async createFirefoxDriver(headless) {
    const options = new firefox.Options();
    
    if (headless) {
      options.addArguments('--headless');
    }
    
    return new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build();
  }

  async createEdgeDriver(headless) {
    const options = new chrome.Options();
    
    if (headless) {
      options.addArguments('--headless');
    }
    
    return new Builder()
      .forBrowser('MicrosoftEdge')
      .setEdgeOptions(options)
      .build();
  }

  async quitDriver() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }

  getDriver() {
    return this.driver;
  }
}

module.exports = new DriverSetup();

