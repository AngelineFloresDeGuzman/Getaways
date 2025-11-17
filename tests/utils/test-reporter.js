const fs = require('fs-extra');
const path = require('path');
const moment = require('moment');
const config = require('../config/test-config');

class TestReporter {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startTime: null,
      endTime: null,
      testCases: []
    };
  }

  start() {
    this.results.startTime = moment().format('YYYY-MM-DD HH:mm:ss');
  }

  end() {
    this.results.endTime = moment().format('YYYY-MM-DD HH:mm:ss');
    const start = moment(this.results.startTime);
    const end = moment(this.results.endTime);
    this.results.duration = end.diff(start, 'seconds');
  }

  addTestResult(testCase) {
    this.results.total++;
    this.results.testCases.push(testCase);
    
    if (testCase.status === 'passed') {
      this.results.passed++;
    } else if (testCase.status === 'failed') {
      this.results.failed++;
    } else {
      this.results.skipped++;
    }
  }

  calculatePassRate() {
    if (this.results.total === 0) return 0;
    return ((this.results.passed / this.results.total) * 100).toFixed(2);
  }

  async generateHTMLReport() {
    const passRate = this.calculatePassRate();
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const reportPath = path.join(config.reports.path, `test-report-${timestamp}.html`);

    await fs.ensureDir(config.reports.path);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Getaways Platform - Test Summary Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .summary-card.passed { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
        .summary-card.failed { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); }
        .summary-card.total { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
        .summary-card h3 {
            font-size: 36px;
            margin-bottom: 5px;
        }
        .summary-card p {
            font-size: 14px;
            opacity: 0.9;
        }
        .pass-rate {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #ecf0f1;
            border-radius: 8px;
        }
        .pass-rate h2 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .pass-rate .rate {
            font-size: 48px;
            font-weight: bold;
            color: ${parseFloat(passRate) >= 85 ? '#27ae60' : '#e74c3c'};
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #34495e;
            color: white;
            font-weight: 600;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .status {
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
        }
        .status.passed {
            background: #d4edda;
            color: #155724;
        }
        .status.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .status.skipped {
            background: #fff3cd;
            color: #856404;
        }
        .details {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 4px solid #3498db;
        }
        .error {
            color: #e74c3c;
            font-family: monospace;
            font-size: 12px;
            margin-top: 10px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Getaways Platform - Test Summary Report</h1>
        
        <div class="summary">
            <div class="summary-card total">
                <h3>${this.results.total}</h3>
                <p>Total Tests</p>
            </div>
            <div class="summary-card passed">
                <h3>${this.results.passed}</h3>
                <p>Passed</p>
            </div>
            <div class="summary-card failed">
                <h3>${this.results.failed}</h3>
                <p>Failed</p>
            </div>
            <div class="summary-card">
                <h3>${this.results.skipped}</h3>
                <p>Skipped</p>
            </div>
        </div>

        <div class="pass-rate">
            <h2>Pass Rate</h2>
            <div class="rate">${passRate}%</div>
            <p>Target: 85%</p>
            <p style="color: ${parseFloat(passRate) >= 85 ? '#27ae60' : '#e74c3c'}; font-weight: bold; margin-top: 10px;">
                ${parseFloat(passRate) >= 85 ? '✓ Requirement Met' : '✗ Requirement Not Met'}
            </p>
        </div>

        <h2 style="margin-top: 30px; color: #2c3e50;">Test Cases</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Test Case ID</th>
                    <th>Test Case Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Duration (s)</th>
                </tr>
            </thead>
            <tbody>
                ${this.results.testCases.map((test, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${test.id || 'N/A'}</td>
                    <td>${test.name}</td>
                    <td>${test.category || 'General'}</td>
                    <td><span class="status ${test.status}">${test.status.toUpperCase()}</span></td>
                    <td>${test.duration || 'N/A'}</td>
                </tr>
                ${test.error ? `
                <tr>
                    <td colspan="6">
                        <div class="details">
                            <strong>Error Details:</strong>
                            <div class="error">${test.error}</div>
                        </div>
                    </td>
                </tr>
                ` : ''}
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p><strong>Test Execution Details</strong></p>
            <p>Start Time: ${this.results.startTime}</p>
            <p>End Time: ${this.results.endTime}</p>
            <p>Total Duration: ${this.results.duration} seconds</p>
            <p>Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
        </div>
    </div>
</body>
</html>
    `;

    await fs.writeFile(reportPath, html);
    console.log(`\nTest report generated: ${reportPath}`);
    console.log(`Pass Rate: ${passRate}%`);
    
    return reportPath;
  }

  async generateJSONReport() {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const reportPath = path.join(config.reports.path, `test-report-${timestamp}.json`);

    await fs.ensureDir(config.reports.path);
    
    const report = {
      ...this.results,
      passRate: this.calculatePassRate(),
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }
}

module.exports = TestReporter;

