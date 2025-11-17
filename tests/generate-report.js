const TestReporter = require('./utils/test-reporter');
const fs = require('fs-extra');
const path = require('path');

// This script can be used to generate a report from existing test results
// or as a standalone report generator

async function generateReport() {
  const reporter = new TestReporter();
  
  // If you have existing test results, load them here
  // For now, this is a placeholder that shows how to generate a report
  
  reporter.start();
  
  // Add sample test results (in real scenario, these would come from test execution)
  reporter.addTestResult({
    id: 'TC-001',
    name: 'Sample Test Case 1',
    category: 'Authentication',
    status: 'passed',
    duration: '2.5'
  });
  
  reporter.end();
  
  // Generate reports
  const htmlReport = await reporter.generateHTMLReport();
  const jsonReport = await reporter.generateJSONReport();
  
  console.log('\n=== Test Report Generation Complete ===');
  console.log(`HTML Report: ${htmlReport}`);
  console.log(`JSON Report: ${jsonReport}`);
  console.log(`Pass Rate: ${reporter.calculatePassRate()}%`);
}

// Run if called directly
if (require.main === module) {
  generateReport().catch(console.error);
}

module.exports = generateReport;

