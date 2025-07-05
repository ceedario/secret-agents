# Claude Interaction Analysis for CEA-136

## Executive Summary

This analysis examines how Claude Code/Cyrus currently processes and responds to Linear issues, focusing on interaction patterns, behavior, and areas for improvement in the prompt system. The analysis reveals both strengths and significant opportunities for optimization in the current prompt structure.

## Current Architecture Overview

### Core Interaction Flow

1. **Issue Assignment** → Linear webhook → Proxy → Edge Worker
2. **Prompt Building** → Template variable substitution → Claude SDK invocation
3. **Response Processing** → Tool usage tracking → Linear comment updates
4. **Session Management** → Conversation continuity → TODO integration

### Key Components

- **Prompt Template**: `/packages/edge-worker/prompt-template.md` (116 lines)
- **Prompt Builder**: `EdgeWorker.buildInitialPrompt()` method
- **Claude Runner**: TypeScript SDK-based execution wrapper
- **Response Handler**: Tool-specific processing and Linear integration

## Current Prompt Structure Analysis

### Strengths

#### 1. Two-Situation Framework
The current prompt effectively uses a binary decision model:
- **Situation 1 (Execute)**: Clear requirements → systematic implementation
- **Situation 2 (Clarify)**: Vague requirements → investigation and clarification

This provides clear guidance and reduces ambiguity about Claude's primary task.

#### 2. Tool Integration Guidance
Strong emphasis on TODO tool usage:
```markdown
IMPORTANT: Use the TodoWrite and TodoRead tools to track your progress:
- Create a comprehensive task list at the beginning of your work
- Break down complex tasks into smaller, actionable items
- Mark tasks as 'in_progress' when you start them
```

#### 3. Context-Rich Information
The prompt includes comprehensive issue context:
- Repository details
- Issue metadata (title, description, state, priority)
- Comment history
- Working directory setup
- Git branch information

### Current Weaknesses

#### 1. Cognitive Load Issues
**Problem**: The prompt is dense and instruction-heavy (116 lines), which can lead to:
- Information overload
- Reduced focus on core task
- Inconsistent adherence to all guidelines

**Evidence**: The prompt contains multiple nested instruction sets, detailed workflows, and extensive metadata that may overwhelm Claude's attention.

#### 2. Rigid Two-Situation Model
**Problem**: Real-world issues often fall into a spectrum rather than binary categories:
- Partially defined requirements
- Issues with some clear aspects and some ambiguous ones
- Technical debt items that need both investigation and implementation

**Current Approach**: Forces Claude to choose between "Execute" or "Clarify" when many issues benefit from both approaches.

#### 3. Tool Usage Enforcement Issues
**Problem**: While the prompt emphasizes TODO tool usage, analysis of the code shows:
- TODO integration happens via tool detection in `handleClaudeMessage()`
- No enforcement mechanism if Claude doesn't use TodoWrite
- Limited feedback loop for tool usage patterns

**Code Evidence**:
```typescript
// EdgeWorker.ts:640
if ('name' in item && item.name === 'TodoWrite' && 'input' in item && item.input?.todos) {
  console.log(`[EdgeWorker] Detected TodoWrite tool use with ${item.input.todos.length} todos`)
  await this.updateCommentWithTodos(issueId, item.input.todos, repositoryId)
}
```

#### 4. Limited Error Recovery Guidance
**Problem**: The prompt provides minimal guidance for:
- Handling unclear or conflicting requirements
- Recovering from failed implementations
- Managing scope creep during development
- Dealing with missing dependencies or tools

#### 5. Final Output Requirements Unclear
**Problem**: The prompt requires a "clear text-based summary" but:
- Doesn't specify format or structure
- No guidance on length or detail level
- Unclear relationship to TODO completion status

## Response Pattern Analysis

### Common Tool Usage Patterns

Based on code analysis and mock implementations:

#### 1. Expected Workflow Tools
- **TodoWrite/TodoRead**: Task management and progress tracking
- **Read**: Codebase exploration and file examination
- **Edit/MultiEdit**: Code implementation
- **Bash**: Testing, building, and git operations
- **Grep/Glob**: Code search and discovery

#### 2. Actual Implementation
```typescript
// EdgeWorker.ts:357
const runner = new ClaudeRunner({
  workingDirectory: workspace.path,
  allowedTools: repository.allowedTools || this.config.defaultAllowedTools || getSafeTools(),
  allowedDirectories,
  workspaceName: fullIssue.identifier,
  mcpConfigPath: repository.mcpConfigPath,
  onMessage: (message) => this.handleClaudeMessage(fullIssue.id, message, repository.id),
  onComplete: (messages) => this.handleClaudeComplete(fullIssue.id, messages, repository.id),
  onError: (error) => this.handleClaudeError(fullIssue.id, error, repository.id)
})
```

### Error Handling Patterns

#### Current Error Handling
1. **Token Limit Handling**: Automatic session restart with fresh context
2. **Tool Failures**: Logged but not actively recovered
3. **Linear API Failures**: Fallback to simple prompts
4. **Claude Session Errors**: Session termination and cleanup

#### Error Recovery Gaps
- No guidance for partial completion scenarios
- Limited retry mechanisms for failed operations
- No escalation path for complex errors

## TODO Integration Effectiveness

### Current Implementation
```typescript
// TODO formatting for Linear comments
private formatTodosAsChecklist(todos: Array<{id: string, content: string, status: string, priority: string}>): string {
  return todos.map(todo => {
    const checkbox = todo.status === 'completed' ? '[x]' : '[ ]'
    const statusEmoji = todo.status === 'in_progress' ? ' 🔄' : ''
    return `- ${checkbox} ${todo.content}${statusEmoji}`
  }).join('\n')
}
```

### Effectiveness Assessment
**Strengths**:
- Real-time progress updates in Linear comments
- Visual feedback through checkboxes and emojis
- Integration with Claude's natural workflow

**Weaknesses**:
- No validation of TODO completeness vs actual work done
- Limited granularity in progress tracking
- No handling of TODO modifications during execution

## Code Quality Assessment

### Generated Code Patterns
Based on the codebase structure and tooling:

**Positive Indicators**:
- TypeScript-first approach with strong typing
- Comprehensive error handling patterns
- Modular architecture with clear separation of concerns
- Integration with standard development tools (git, tests, etc.)

**Quality Concerns**:
- No explicit code review guidance in prompts
- Limited emphasis on testing requirements
- No mention of code style or formatting standards
- Missing guidance on documentation requirements

## Recommendations for Prompt Iteration

### 1. Streamline Core Structure (High Priority)

**Current Issue**: Information overload reduces effectiveness
**Recommendation**: Reduce prompt length by 30-40% and use progressive disclosure

**Proposed Structure**:
```markdown
# Core Task
[Single clear paragraph defining primary objective]

# Issue Context
[Essential information only - title, description, key constraints]

# Approach Selection
[Simplified decision framework with examples]

# Execution Guidelines
[Concise, actionable steps with tool usage patterns]
```

### 2. Enhance Decision Framework (High Priority)

**Current Issue**: Binary Execute/Clarify model too rigid
**Recommendation**: Replace with flexible approach spectrum

**Proposed Framework**:
- **Fully Specified**: Complete requirements → Direct implementation
- **Partially Specified**: Mixed clarity → Targeted investigation + implementation
- **Under-Specified**: Unclear requirements → Full discovery process

### 3. Improve Tool Usage Guidance (Medium Priority)

**Current Issue**: TODO tool usage not enforced or validated
**Recommendation**: Implement progressive tool usage patterns

**Proposed Enhancements**:
```markdown
# Required Tool Workflow
1. START: TodoWrite (create initial plan)
2. DISCOVER: Read/Grep (understand context)
3. IMPLEMENT: Edit/Bash (build solution)
4. VERIFY: Bash (test and validate)
5. COMPLETE: TodoWrite (mark completion)
```

### 4. Add Error Recovery Patterns (Medium Priority)

**Current Issue**: Limited guidance for handling problems
**Recommendation**: Include common error scenarios and recovery steps

**Proposed Additions**:
- Handling ambiguous requirements
- Managing implementation blockers
- Dealing with test failures
- Scope management strategies

### 5. Enhance Output Requirements (Low Priority)

**Current Issue**: Vague final summary requirements
**Recommendation**: Provide structured output template

**Proposed Template**:
```markdown
# Summary Template
## Completed Work
- [Bullet points of actual changes made]

## Issues Encountered
- [Problems faced and how resolved]

## Next Steps
- [Any remaining work or recommendations]
```

### 6. Add Quality Assurance Focus (Low Priority)

**Current Issue**: No explicit quality guidance
**Recommendation**: Include quality checkpoints

**Proposed Additions**:
- Code review self-checklist
- Testing requirements and standards
- Documentation expectations
- Performance considerations

## Implementation Priority

### Phase 1: Core Improvements (Immediate)
1. Streamline prompt structure (reduce cognitive load)
2. Enhance decision framework (replace binary model)
3. Improve tool workflow guidance

### Phase 2: Enhanced Features (Short-term)
1. Add error recovery patterns
2. Implement quality assurance guidelines
3. Enhance output structure requirements

### Phase 3: Advanced Optimizations (Long-term)
1. Dynamic prompt adaptation based on issue type
2. Learning-based prompt improvements
3. Integration with project-specific conventions

## Conclusion

The current prompt system provides a solid foundation with strong tool integration and clear structure. However, it suffers from information overload and rigidity that can reduce Claude's effectiveness. The recommended improvements focus on streamlining the core structure while enhancing flexibility and error handling capabilities.

Key success metrics for prompt improvements should include:
- Reduced average session length for similar issues
- Increased TODO tool usage consistency
- Better handling of edge cases and errors
- Improved code quality and test coverage
- Higher user satisfaction with issue resolution

The two-situation framework should evolve into a more nuanced approach that better reflects the reality of software development work, where investigation and implementation often happen iteratively rather than as discrete phases.