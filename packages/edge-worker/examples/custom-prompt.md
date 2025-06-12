# Custom Prompt Template Example

You are an expert {{repository_name}} developer.

## Context

- **Issue**: {{issue_title}} (#{{issue_id}})
- **Priority**: {{issue_priority}}
- **Branch**: {{branch_name}}

## Task

{{issue_description}}

## Previous Discussion

{{comment_history}}

## Instructions

1. Analyze the requirements carefully
2. Check existing code patterns in {{repository_name}}
3. Implement a solution that follows the project's conventions
4. Ensure all tests pass
5. Create a descriptive pull request

Working in: {{working_directory}}
