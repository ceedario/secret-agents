# Cyrus

<div>
  <a href="https://ceedar.ai">
    <img src="https://img.shields.io/badge/Built%20by-Ceedar.ai-b8ec83?style=for-the-badge&logoColor=black&labelColor=333333" alt="Built by Ceedar.ai">
  </a><br />
  <a href="https://github.com/ceedaragents/cyrus/actions">
    <img src="https://github.com/ceedaragents/cyrus/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
</div>


AI development agent for Linear powered by Claude Code. Cyrus monitors Linear issues assigned to it, creates isolated Git worktrees for each issue, runs Claude Code sessions to process them, and posts responses back to Linear as comments, all from the safety and security of your own computer.

## Installation

### Via npm (recommended)

```bash
npm install -g cyrus-ai
```

## Quick Start

#### Pre-requisites:
Have [`claude`](https://docs.anthropic.com/en/docs/claude-code/overview) installed. If you don't already have it, that's `npm install -g @anthropic-ai/claude-code`
Then, make sure you run `claude` so that you get the authentication to your Claude account arranged. If you're feeling fancy you might set up some MCP servers.

(optional, if you want Cyrus to push PRs to Github): Have [`gh`](https://cli.github.com/) (Github) installed. `brew install gh` or find your platform instructions at [this link](https://cli.github.com/). Authenticate using `gh auth login` as the user you want PRs to be submitted via.

####  Set up a `.env.cyrus` file.
In it,
```
CLAUDE_PATH=/path/to/your/claude
PROXY_URL=https://cyrus-proxy.ceedar.workers.dev
```

####  Run the main program:
```bash
cyrus
```

####  Follow the prompts to:
 - Connect your Linear workspace via OAuth
 - Configure your repository settings
 - Set up allowed tools (security configuration)

####  Benefit
Keep `cyrus` running, and the agent will start monitoring issues assigned to you in Linear and process them automatically, on your very own device.

## Submitting Work To GitHub

When Claude creates PRs using the `gh` CLI tool, it uses your local GitHub authentication. This means:

- All PRs and commits will be created under your GitHub account
- Comments and mentions in the PR will notify your account
- Review requests will be attributed to you
- Your repository permissions apply to all operations
- The only indication that Claude assisted is the "Co-Authored-By" commit trailer

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

Developed by [Ceedar](https://ceedar.ai/)

This projects builds on the technologies built by the awesome teams at Linear, and Claude by Anthropic:
- [Linear API](https://linear.app/developers)
- [Anthropic Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview)

---

*This README was last updated: June 11 2025*
