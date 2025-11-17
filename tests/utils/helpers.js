const { By, until } = require('selenium-webdriver');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config/test-config');

class Helpers {
  constructor(driver) {
    this.driver = driver;
  }

  // Navigate to URL
  async navigateTo(url) {
    const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`;
    await this.driver.get(fullUrl);
  }

  // Wait for element to be visible
  async waitForElement(selector, timeout = config.timeouts.element) {
    const locator = typeof selector === 'string' ? By.css(selector) : selector;
    return await this.driver.wait(
      until.elementIsVisible(this.driver.findElement(locator)),
      timeout
    );
  }

  // Wait for element to be clickable
  async waitForClickable(selector, timeout = config.timeouts.element) {
    const locator = typeof selector === 'string' ? By.css(selector) : selector;
    return await this.driver.wait(
      until.elementIsEnabled(this.driver.findElement(locator)),
      timeout
    );
  }

  // Click element
  async click(selector) {
    const element = await this.waitForClickable(selector);
    await element.click();
  }

  // Type text
  async type(selector, text) {
    const element = await this.waitForElement(selector);
    await element.clear();
    await element.sendKeys(text);
  }

  // Get text
  async getText(selector) {
    const element = await this.waitForElement(selector);
    return await element.getText();
  }

  // Get attribute
  async getAttribute(selector, attribute) {
    const element = await this.waitForElement(selector);
    return await element.getAttribute(attribute);
  }

  // Check if element exists
  async isElementPresent(selector) {
    try {
      await this.driver.findElement(By.css(selector));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Wait for page to load
  async waitForPageLoad() {
    await this.driver.wait(
      async () => {
        const state = await this.driver.executeScript('return document.readyState');
        return state === 'complete';
      },
      config.timeouts.pageLoad
    );
  }

  // Scroll to element
  async scrollTo(selector) {
    const element = await this.driver.findElement(By.css(selector));
    await this.driver.executeScript('arguments[0].scrollIntoView(true);', element);
    await this.sleep(500);
  }

  // Sleep
  async sleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // Take screenshot
  async takeScreenshot(filename) {
    if (!config.screenshots.enabled || !this.driver) {
      console.warn('Screenshots disabled or driver not available');
      return null;
    }

    try {
      const screenshotDir = path.resolve(config.screenshots.path);
      await fs.ensureDir(screenshotDir);
      
      // Clean filename (remove invalid characters)
      const cleanFilename = filename.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
      const timestamp = Date.now();
      const filepath = path.join(screenshotDir, `${cleanFilename}-${timestamp}.png`);
      
      // Take screenshot - returns base64 encoded string
      const screenshotBase64 = await this.driver.takeScreenshot();
      
      if (!screenshotBase64 || screenshotBase64.length === 0) {
        console.error('Screenshot data is empty');
        return null;
      }
      
      // Convert base64 string to buffer
      const buffer = Buffer.from(screenshotBase64, 'base64');
      
      if (buffer.length === 0) {
        console.error('Buffer is empty after conversion');
        return null;
      }
      
      // Write file synchronously to ensure it's saved
      await fs.writeFile(filepath, buffer, { encoding: 'binary' });
      
      // Verify file was written
      const stats = await fs.stat(filepath);
      if (stats.size > 0) {
        console.log(`📸 Screenshot saved: ${filepath} (${Math.round(stats.size / 1024)} KB)`);
        return filepath;
      } else {
        console.error('Screenshot file is empty after writing');
        return null;
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
      console.error('Error stack:', error.stack);
      return null;
    }
  }

  // Wait for URL to contain
  async waitForUrl(urlPart, timeout = config.timeouts.pageLoad) {
    await this.driver.wait(
      until.urlContains(urlPart),
      timeout
    );
  }

  // Switch to new window
  async switchToNewWindow() {
    const handles = await this.driver.getAllWindowHandles();
    await this.driver.switchTo().window(handles[handles.length - 1]);
  }

  // Switch to original window
  async switchToOriginalWindow(originalHandle) {
    await this.driver.switchTo().window(originalHandle);
  }

  // Execute JavaScript
  async executeScript(script, ...args) {
    return await this.driver.executeScript(script, ...args);
  }

  // Get current URL
  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  // Get page title
  async getPageTitle() {
    return await this.driver.getTitle();
  }
}

module.exports = Helpers;

