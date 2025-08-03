#!/usr/bin/env node

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

interface TestResult {
  file: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

class TestRunner {
  private testDir = path.join(process.cwd(), 'src');
  private results: TestResult[] = [];

  async runTests(): Promise<TestSummary> {
    console.log('🧪 Starting test suite...\n');

    const startTime = Date.now();

    try {
      // Run Jest tests
      const jestResult = await this.runJestTests();
      this.results.push(...jestResult);

      // Run custom test files
      const customResult = await this.runCustomTests();
      this.results.push(...customResult);

      const duration = Date.now() - startTime;
      const summary = this.generateSummary(duration);

      this.printResults(summary);
      return summary;
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      throw error;
    }
  }

  private async runJestTests(): Promise<TestResult[]> {
    console.log('📋 Running Jest tests...');
    
    try {
      const startTime = Date.now();
      
      // Run Jest with coverage
      execSync('npm test -- --coverage --watchAll=false --verbose', {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      const duration = Date.now() - startTime;
      
      // Jest handles its own output, so we just return a success result
      return [{
        file: 'Jest Test Suite',
        passed: true,
        duration
      }];
    } catch (error) {
      return [{
        file: 'Jest Test Suite',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      }];
    }
  }

  private async runCustomTests(): Promise<TestResult[]> {
    console.log('🔧 Running custom tests...');
    
    const results: TestResult[] = [];
    const testFiles = await this.findTestFiles();

    for (const file of testFiles) {
      const startTime = Date.now();
      
      try {
        // Import and run the test file
        const testModule = await import(file);
        
        if (typeof testModule.runTests === 'function') {
          await testModule.runTests();
        }

        results.push({
          file: path.basename(file),
          passed: true,
          duration: Date.now() - startTime
        });
      } catch (error) {
        results.push({
          file: path.basename(file),
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        });
      }
    }

    return results;
  }

  private async findTestFiles(): Promise<string[]> {
    const testFiles: string[] = [];
    
    const findTests = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await findTests(fullPath);
        } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) {
          testFiles.push(fullPath);
        }
      }
    };

    await findTests(this.testDir);
    return testFiles;
  }

  private generateSummary(duration: number): TestSummary {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    return {
      total: this.results.length,
      passed,
      failed,
      duration,
      results: this.results
    };
  }

  private printResults(summary: TestSummary): void {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(50));
    
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log(`Duration: ${summary.duration}ms`);
    
    if (summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      summary.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  - ${result.file}: ${result.error}`);
        });
    }

    console.log('\n✅ All tests completed!');
  }

  async generateReport(summary: TestSummary): Promise<void> {
    const reportDir = path.join(process.cwd(), 'test-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    const reportFile = path.join(reportDir, `test-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    console.log(`📄 Test report saved to: ${reportFile}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  try {
    const summary = await runner.runTests();
    
    if (args.includes('--report')) {
      await runner.generateReport(summary);
    }

    // Exit with error code if tests failed
    if (summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { TestRunner }; 