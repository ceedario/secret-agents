# Current Prompt Analysis for CEA-136

## Summary
This document analyzes the current 'issue assigned' prompt/template system in the Cyrus codebase. The system uses markdown templates with variable substitution to generate context-aware prompts for Claude when processing Linear issues.

## Key Findings

### 1. Template Locations and Hierarchy

**Primary Templates:**
- `/Users/agentops/code/cyrus-workspaces/CEA-136/packages/edge-worker/prompt-template.md` - **Current default template**
- `/Users/agentops/code/cyrus-workspaces/CEA-136/apps/cli/agent-prompt-template.md` - **Legacy template (unused)**
- `/Users/agentops/code/cyrus-workspaces/CEA-136/packages/edge-worker/examples/custom-prompt.md` - **Example template**

**Template Resolution Order:**
1. Repository-specific template (`repository.promptTemplatePath`)
2. Global custom template (`config.features.promptTemplatePath`)
3. Default built-in template (`packages/edge-worker/prompt-template.md`)

### 2. Current Active Template Content

The current active template is `/Users/agentops/code/cyrus-workspaces/CEA-136/packages/edge-worker/prompt-template.md`:

```markdown
You are a masterful software engineer contributing to the {{repository_name}} project.

YOU ARE IN 1 OF 2 SITUATIONS AND YOUR FIRST JOB IS TO FIGURE OUT WHICH ONE:

**Situation 1 - Execute**: The issue contains a clear problem definition AND a clear solution definition. Look for:
- Specific acceptance criteria
- Clear requirements
- Well-defined expected outcomes

In this situation, your task is to:
1. Use the TodoWrite tool to create a comprehensive task list
2. Work through each task systematically, marking progress as you go
3. Write the code following the project's conventions
4. Run tests and fix any issues
5. Create a pull request when complete

**Situation 2 - Clarify**: The issue contains only a vague problem or lacks clear acceptance criteria. The requirements have significant gaps or ambiguities.

In this situation, your task is to:
1. Use the TodoWrite tool to list investigation tasks
2. Explore the codebase to understand context
3. Identify gaps in the requirements
4. Ask clarifying questions
5. Help refine the acceptance criteria

## Issue Details

**Repository**: {{repository_name}}
**Issue ID**: {{issue_id}}
**Title**: {{issue_title}}
**Description**:
{{issue_description}}

**State**: {{issue_state}}
**Priority**: {{issue_priority}}
**URL**: {{issue_url}}

## Comment History

{{comment_history}}

## Latest Comment

{{latest_comment}}

## Working Directory

You are working in: {{working_directory}}
Base branch: {{base_branch}}

## Task Management

IMPORTANT: Use the TodoWrite and TodoRead tools to track your progress:
- Create a comprehensive task list at the beginning of your work
- Break down complex tasks into smaller, actionable items
- Mark tasks as 'in_progress' when you start them
- Mark tasks as 'completed' immediately after finishing them
- Only have ONE task 'in_progress' at a time
- This helps track progress and ensures nothing is missed

## Instructions

### If Situation 1 (Execute):
1. First, use TodoWrite to create a task list that includes:
   - Checking current branch status
   - Understanding the codebase structure
   - Implementation tasks (broken down by component/feature)
   - Testing tasks
   - PR creation/update

2. Check how the current branch compares to `{{base_branch}}`:
   ```
   git diff {{base_branch}}...HEAD
   ```

3. Check if a PR already exists:
   ```
   gh pr list --head {{branch_name}}
   ```

4. Work through your TODO list systematically:
   - Mark each task as 'in_progress' when you start
   - Mark as 'completed' immediately when done
   - Add new tasks as you discover them

5. Run tests and ensure code quality

6. Create or update the pull request with adequate description

### If Situation 2 (Clarify):
1. First, use TodoWrite to create investigation tasks:
   - Areas of codebase to explore
   - Documentation to review
   - Questions to formulate
   - Acceptance criteria to suggest

2. Work through your investigation TODO list systematically

3. DO NOT make any code changes

4. Provide a clear summary of:
   - What you understand about the problem
   - What assumptions need clarification
   - Specific questions that need answers
   - Suggested acceptance criteria

Remember: Your primary goal is to determine which situation you're in and respond appropriately. Always start by creating a TODO list to organize your approach.

## Final Output Requirement

IMPORTANT: Always end your response with a clear text-based summary of:
- What you accomplished
- Any issues encountered
- Next steps (if any)

This final summary will be posted to Linear, so make it concise and informative.
```

### 3. Template Variables

The system supports the following template variables:

- `{{repository_name}}` - Display name of the repository
- `{{issue_id}}` - Linear issue ID
- `{{issue_title}}` - Issue title
- `{{issue_description}}` - Issue description
- `{{issue_state}}` - Current issue state
- `{{issue_priority}}` - Issue priority
- `{{issue_url}}` - Linear issue URL
- `{{comment_history}}` - Formatted comment history
- `{{latest_comment}}` - Most recent comment
- `{{working_directory}}` - Working directory path
- `{{base_branch}}` - Base branch name
- `{{branch_name}}` - Issue branch name

### 4. Initial Comment System

When an issue is assigned, the system:

1. **Moves issue to "started" state** automatically
2. **Posts initial comment**: "I've been assigned to this issue and am getting started right away. I'll update this comment with my plan shortly."
3. **Updates comment with TODO list** when TodoWrite tool is used

### 5. Implementation Details

**File**: `/Users/agentops/code/cyrus-workspaces/CEA-136/packages/edge-worker/src/EdgeWorker.ts`

**Key Methods:**
- `handleIssueAssigned()` - Main entry point for issue assignment
- `buildInitialPrompt()` - Template processing and variable substitution (lines 769-878)
- `postInitialComment()` - Creates initial comment (lines 1018-1047)
- `updateCommentWithTodos()` - Updates comment with TODO checklist (lines 1095-1122)

**Template Loading Logic** (lines 773-781):
```typescript
// Use custom template if provided (repository-specific takes precedence)
let templatePath = repository.promptTemplatePath || this.config.features?.promptTemplatePath

// If no custom template, use the default one
if (!templatePath) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  templatePath = resolve(__dirname, '../prompt-template.md')
}
```

### 6. Configuration Options

**Repository-level configuration** (`RepositoryConfig` interface):
- `promptTemplatePath?: string` - Custom prompt template for specific repository

**Global configuration** (`EdgeWorkerConfig` interface):
- `features.promptTemplatePath?: string` - Global custom prompt template

**CLI App Behavior** (`apps/cli/app.ts` lines 78-87):
- The CLI app specifically **strips** `promptTemplatePath` from repository configurations
- This ensures the built-in template is always used in CLI mode
- Custom templates are only supported in EdgeWorker package usage

### 7. Legacy Template

The legacy template at `/Users/agentops/code/cyrus-workspaces/CEA-136/apps/cli/agent-prompt-template.md` is **not used** but still exists. It has similar structure but less detailed instructions and no TODO tool integration.

### 8. Continuation Behavior

When users comment on issues (mention the agent):
- Posts immediate reply: "I'm getting started on that right away. I'll update this comment with my plan as I work through it."
- Updates the reply with TODO list when TodoWrite is used
- Supports threaded replies using Linear's comment threading

### 9. Attachment Support

The system can download and reference attachments from Linear issues:
- Downloads images and files to `~/.cyrus/<workspace>/attachments/`
- Generates manifest describing available attachments
- Appends manifest to the prompt

## Areas for Improvement

1. **Situation Detection**: The current logic relies on Claude to determine if requirements are clear
2. **Template Customization**: Limited ability to customize templates in CLI mode
3. **Prompt Length**: Can become very long with extensive comment history
4. **Error Handling**: Fallback prompt is quite basic
5. **Attachment Context**: Could better integrate attachment content into the prompt

## Configuration Examples

**Repository-specific template:**
```json
{
  "repositories": [{
    "id": "my-repo",
    "promptTemplatePath": "/path/to/custom-template.md"
  }]
}
```

**Global template:**
```json
{
  "features": {
    "promptTemplatePath": "/path/to/global-template.md"
  }
}
```

This analysis provides a comprehensive overview of the current prompt system architecture and implementation details for issue CEA-136.