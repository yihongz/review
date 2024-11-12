require('dotenv').config();
const { Octokit } = require("@octokit/rest");

class GitHubService {
  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  async getPRDetails(owner, repo, pull_number) {
    const prResponse = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number,
    });
    return prResponse.data;
  }

  async getDiff(owner, repo, pull_number) {
    const response = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number,
      mediaType: { format: "diff" },
    });
    return response.data;
  }
}

module.exports = GitHubService;