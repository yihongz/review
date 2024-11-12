#!/usr/bin/env node

require('dotenv').config();
const readline = require('readline');
const path = require('path');
const GitHubService = require('./GitHubService');
const OpenAIService = require('./OpenAIService');
const EmbeddingService = require('./EmbeddingService');
const ReviewReportGenerator = require('./ReviewReportGenerator');
const { cleanAndTokenize } = require('./utils/helpers');
const shell = require('shelljs');
const fs = require('fs');

class PRAnalyzer {
  constructor() {
    this.gitHubService = new GitHubService();
    this.openAIService = new OpenAIService();
    this.embeddingService = new EmbeddingService();
    this.reportGenerator = new ReviewReportGenerator();
    this.repoDir = path.join(__dirname, './repo');
    this.supportedExtensions = ['txt', 'md', 'py', 'js', 'java', 'c', 'cpp', 'html', 'css', 'json', 'php', 'ts'];
  }

  async cloneRepository(repoUrl) {
    if (fs.existsSync(this.repoDir)) {
      shell.rm('-rf', this.repoDir);
    }
    shell.exec(`git clone ${repoUrl} ${this.repoDir}`);
  }

  isSupportedFile(file) {
    const ext = path.extname(file).substring(1);
    return this.supportedExtensions.includes(ext);
  }

  async processFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        await this.processFiles(filePath);
      } else if (this.isSupportedFile(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        const cleanedContent = cleanAndTokenize(content).slice(0, 8000); // Limit to 8000 characters
        const embedding = await this.openAIService.generateEmbedding(cleanedContent);
        if (embedding) {
          await this.embeddingService.saveEmbedding(filePath, cleanedContent, embedding);
        }
      }
    }
  }

  async generateRepositoryEmbeddings(owner, repo) {
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    await this.cloneRepository(repoUrl);
    await this.processFiles(this.repoDir);
    console.log('Repository embeddings generated.');
  }

  async analyzePR(owner, repo, pull_number) {
    const prDetails = await this.gitHubService.getPRDetails(owner, repo, pull_number);

    const diff = await this.gitHubService.getDiff(owner, repo, pull_number);

    const cleanedDiff = cleanAndTokenize(diff);

    const diffEmbedding = await this.openAIService.generateEmbedding(cleanedDiff.slice(0, 8000));

    let context = '';
    if (await this.embeddingService.embeddingsExist() && diffEmbedding) {
      const relevantDocs = await this.embeddingService.searchRelevantDocuments(diffEmbedding, 5);

      context = relevantDocs.map(doc => {
        try {
          return fs.readFileSync(doc.file_path, 'utf-8');
        } catch (err) {
          console.error(`Erro ao ler o arquivo ${doc.file_path}:`, err);
          return '';
        }
      }).join('\n\n');
    }

    const prompt = this.createPrompt(prDetails, diff, context);
    const analysisResults = await this.openAIService.analyzeCode(prompt);

    this.reportGenerator.generateReport(prDetails, analysisResults);

    await this.embeddingService.closeConnection();
  }

  createPrompt(prDetails, diff, context) {
    return `
You are reviewing a Pull Request titled "${prDetails.title}" by ${prDetails.user.login}.

## Pull Request Description

${prDetails.body || 'No description provided.'}

${context ? '## Relevant Code Context\n\n' + context : ''}

## Diff to Review

\`\`\`diff
${diff}
\`\`\`

## Instructions

- Analyze the code changes for quality, consistency, and potential issues.
- Identify any technical debts or code smells.
- Provide actionable recommendations for refactoring and optimization.
- Format your response in clear, concise language.

## Review:
`;
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Enter the repository owner: ', (owner) => {
    rl.question('Enter the repository name: ', (repo) => {
      rl.question('Do you want to generate embeddings for the entire repository? (yes/no): ', async (answer) => {
        const analyzer = new PRAnalyzer();
        if (answer.trim().toLowerCase() === 'yes') {
          await analyzer.generateRepositoryEmbeddings(owner, repo);
        }
        rl.question('Enter the Pull Request number: ', async (pull_number) => {
          await analyzer.analyzePR(owner, repo, pull_number);
          rl.close();
        });
      });
    });
  });
}

main();