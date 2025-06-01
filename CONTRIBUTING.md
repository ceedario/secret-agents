# Contributing to Linear Claude Agent

We love your input! We want to make contributing to Linear Claude Agent as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code follows the project style guidelines
5. Issue a pull request

### Issues

We use GitHub issues to track work. Here's how to do that effectively:

1. **Bug Reports**: When filing a bug report, include:
   - A clear title and description
   - As much relevant information as possible
   - A code sample or test case demonstrating the issue
   - Version information for Node.js and dependencies

2. **Feature Requests**: When proposing a feature, include:
   - A clear title and description
   - Explain why this feature would be useful
   - Consider how it might impact existing functionality

## Environment Setup

1. Clone the repository
2. Create a `.env` file based on `.env.example`
3. Install dependencies with `pnpm install`
4. Run the tests with `pnpm test`
5. Start the development server with `pnpm run dev`

## Testing

Please make sure to write and run tests for any new code. We use Jest for testing.

- Run all tests: `npm test`
- Run specific tests: `npm test -- path/to/test.mjs`

## Code Style

- Use ESM modules rather than CommonJS
- Follow the existing code structure and organization
- Use JSDoc comments for functions and classes
- Format code consistently with the existing codebase

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.