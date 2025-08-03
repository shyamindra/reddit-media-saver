# Project Templates

This template includes helpful files for project management and development workflow.

## Files Included

### `/tasks/create-prd.md`
A template for creating Product Requirements Documents (PRDs). Use this when you need to define a new feature or functionality.

**Usage:**
1. Copy this file to your project root
2. Follow the instructions to create a detailed PRD
3. Save the PRD as `prd-[feature-name].md` in the `/tasks` directory

### `/tasks/generate-tasks.md`
A template for generating detailed task lists from PRDs. Use this to break down PRDs into actionable development tasks.

**Usage:**
1. Copy this file to your project root
2. Reference an existing PRD file
3. Follow the process to generate a comprehensive task list
4. Save the task list as `tasks-[prd-file-name].md` in the `/tasks` directory

### `/tasks/process-task-list.md`
Guidelines for managing and implementing task lists. Use this to ensure proper workflow when working through generated tasks.

**Usage:**
1. Reference this file when working on task implementation
2. Follow the completion protocol for marking tasks as done
3. Use the commit message format specified
4. Maintain the "Relevant Files" section as you work

## Workflow

1. **Create PRD**: Use `create-prd.md` to define a new feature
2. **Generate Tasks**: Use `generate-tasks.md` to break down the PRD into actionable tasks
3. **Implement**: Follow the generated task list to implement the feature using `process-task-list.md` guidelines

## Customization

You can modify these templates in `~/.cursor/templates/default/tasks/` to suit your specific workflow needs. 