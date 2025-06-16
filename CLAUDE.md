# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This repository contains two submodules:

- `cyrus/` - Main Cyrus agent application and software packages (TypeScript monorepo)
- `cyrus-website/` - Marketing website and payment flow (Next.js)

The cyrus agent is a Linear-Claude integration that monitors issues, creates git worktrees, runs Claude Code sessions, and posts responses back to Linear. The website handles marketing, user onboarding, and payment processing.

## Git Workflow

**On startup, always update submodules to the latest SHA of the main branch:**
```bash
git submodule update --remote --merge
```

**Branch synchronization:** When working on feature branches, ensure submodule branch names match the parent repository branch name to maintain consistency across the project.

When making changes to either submodule:
1. Commit and push changes within the submodule
2. Return to the parent repository and commit the submodule updates
3. Push the parent repository changes to keep everything synchronized