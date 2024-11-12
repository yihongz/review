const fs = require('fs');
const path = require('path');

class ReviewReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, './reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir);
    }
  }

  generateReport(prDetails, analysisResults) {
    const reportContent = `
# Review Report for PR #${prDetails.number}

**Title**: ${prDetails.title}

**Author**: ${prDetails.user.login}

## Analysis Results

${analysisResults}

---

Generated on ${new Date().toISOString()}
`;

    const reportPath = path.join(this.reportsDir, `PR_${prDetails.number}_Review_Report.md`);
    fs.writeFileSync(reportPath, reportContent);
    console.log(`Report generated at: ${reportPath}`);
  }
}

module.exports = ReviewReportGenerator;