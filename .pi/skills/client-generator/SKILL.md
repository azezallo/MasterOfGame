---
name: client-generator
description: Takes the JSON API contract and automatically generates type-safe service functions for the frontend in master_of_game_UI.
---

# Client Generator Skill

This skill is designed to automate the creation of frontend API service functions based on a JSON contract. It ensures that the frontend is always in sync with the backend's capabilities.

## Workflow

1. **Read**: The agent reads the `contracts/api_contract.json` file.
2. **Generate**: The agent creates or updates files in `master_of_game_UI/src/api/` for each module defined in the contract.
3. **Type Safety**: The agent uses TypeScript to ensure all functions have correct input and output types derived from the JSON contract.
4. **Verification**: The agent checks that the generated functions match the contract's paths, methods, and schemas.

## Generation Rules

- **Service Files**: Create one file per module (e.g., `auth.ts`, `players.ts`).
- **Fetch Implementation**: Use the native `fetch` API (unless otherwise specified) with a standardized base URL and headers.
- **Typing**:
    - Use `z.infer` if schemas are provided, or create clean TypeScript interfaces.
    - Every function should return a `Promise<T>` where `T` is the success response type.
    - Handle non-200 responses by throwing a custom `ApiServiceError`.
- **Naming**: Functions should be named based on the method and path (e.g., `login`, `register`, `getMe`).

## Example Output (master_of_game_UI/src/api/auth.ts)

```typescript
import { loginRequest, loginResponse } from './contracts/auth';

export const login = async (data: loginRequest): Promise<loginResponse> => {
  const response = await fetch(`${process.env.API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};
```

## Execution

Run the skill by asking to "Generate API clients from the contract".

Example:
`/skill:client-generator Generate all API services from contracts/api_contract.json`
