# Agent Instructions

## Core Principles
- **Clarify First**: If a requirement is ambiguous, undocumented, or if you lack sufficient context, ask for clarification before proceeding.
- **Iterative Progress**: Aim for functional progress. Do not attempt to achieve perfect implementation in a single step if it complicates the process.
- **Failure Protocol**: If a solution fails after 2-3 iterations, stop and request assistance. Do not guess, hallucinate, or enter a loop of repeated failures.
- **Communication**: Be concise, proactive, and clearly state what you are doing and what you need from the user.
- **Language Policy**: 
    - **English**: Code, code comments, AI-related files (Skills, AGENTS.md, prompt templates, etc.).
    - **Ukrainian**: Project documentation (located in `docs/`).

## Tool Usage Rules
- **`edit` Tool**: The `path` parameter must always be at the top level of the tool call. The `edits` array must only contain objects with `oldText` and `newText`. Do not nest `path` inside `edits`.

## Project Context
- **Documentation Structure**:
    - `docs/vision/`: High-level project vision and principles.
    - `docs/brainstorm/`: Raw ideas and informal notes.
    - `docs/features/roadmap.md`: High-level list of features and their status.
    - `docs/features/specs/`: Detailed specifications for individual features.
- **Frontend**: React, Vite, TypeScript (located in `master_of_game_UI`).
- **Backend**: Node.js, Express, TypeScript (located in `master_of_game_API`).
- **Architecture**: Focused on a clean separation of concerns with a shared understanding of the API contracts.

## Workflow
1. Analyze the request.
2. Check existing documentation and files.
3. Propose a plan or implementation.
4. Execute and verify.
5. Update documentation as needed.
