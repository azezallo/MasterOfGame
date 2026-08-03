# Workspace Rules

## Core Principles
- **Clarify First**: If a requirement is ambiguous, undocumented, or if you lack sufficient context, ask for clarification before proceeding.
- **Iterative Progress**: Aim for functional progress. Do not attempt to achieve perfect implementation in a single step if it complicates the process.
- **Failure Protocol**: If a solution fails after 2-3 iterations, stop and request assistance. Do not guess, hallucinate, or enter a loop of repeated failures.
- **Communication**: Be concise, proactive, and clearly state what you are doing and what you need from the user.
- **Language Policy**: 
    - **English**: Code, code comments, AI-related files (Skills, AGENTS.md, prompt templates, etc.).
    - **Ukrainian**: Project documentation (located in `docs/`).

## Tool Usage & Best Practices
- **Atomic Edits**: To minimize errors and prevent validation failures, do not update large files in a single call. Update files incrementally, one functional element or logical block at a time. Ensure replacement text is precise and unique.

## Project Context
- **Documentation Structure**:
    - `docs/vision/`: High-level project vision and principles. **CRITICAL: Always read `docs/vision/glossary.md` to understand core game terminology (e.g., AI Master, Narrative-First UI).**
    - `docs/brainstorm/`: Raw ideas and informal notes.
    - `docs/features/roadmap.md`: High-level list of features and their status.
    - `docs/features/specs/`: Detailed specifications for individual features.
- **Frontend**: React, Vite, TypeScript (located in `master_of_game_UI`).
- **Backend**: Node.js, Express, TypeScript (located in `master_of_game_API`).
- **Architecture**: Focused on a clean separation of concerns with a shared understanding of the API contracts.

## Project Navigation
- **Exploration**: When exploring the project structure, avoid noisy recursive listings.
- **Focus**: Always focus on the core logic folders (e.g., `src/`, `docs/`, `plans/`).

## Workflow
1. Analyze the request.
2. Check existing documentation and files.
3. Propose a plan or implementation.
4. Execute and verify.
5. Update documentation as needed.

## Design & Architecture Philosophy
- **Narrative-First UI**: The player UI acts strictly as a read-only mirror of the true game state. Do not design mechanical action buttons (e.g., "Equip", "Use", "Drop") that bypass the chat. All player actions must be declared in narrative text so the AI Master can evaluate context, physics, and logic before updating the state via backend tools.
- **Sovereign AI Master**: The system backend and the AI Master hold the absolute truth. Avoid hardcoding rigid constraints into schemas (like fixed equipment slots) that might contradict the Master's narrative freedom (e.g., a character having a mechanical third arm). Prefer dynamic arrays and layer-based logic over strict enums where physical anatomy or world interaction is involved.
- **Lore-Driven Mechanics**: Ensure economic and structural logic aligns with the world's reality. Simplify mechanics that cause cognitive load (e.g., use a universal "coins" currency instead of multi-tier metals) and ground parameters in realism (e.g., dual-contour weight limits, prices reflecting actual labor/training).
