# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This repository contains two submodules:

- `cyrus/` - Main Cyrus agent application and software packages (TypeScript monorepo)
- `cyrus-website/` - Marketing website and payment flow (Next.js)

The cyrus agent is a Linear-Claude integration that monitors issues, creates git worktrees, runs Claude Code sessions, and posts responses back to Linear. The website handles marketing, user onboarding, and payment processing.