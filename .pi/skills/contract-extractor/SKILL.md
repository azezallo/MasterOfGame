---
name: contract-extractor
description: Scans the backend codebase (master_of_game_API) to extract all API endpoints, request/response schemas, and generates a unified JSON contract for the frontend.
---

# Contract Extractor Skill

This skill is designed to maintain a "Single Source of Truth" between the backend and frontend by automatically extracting API definitions from the backend source code.

## Workflow

1. **Scan**: The agent scans the `master_of_game_API` directory, focusing on `src/routes`, `src/controllers`, and `src/services`.
2. **Analyze**:
    - Identify all HTTP methods (GET, POST, PUT, DELETE, PATCH).
    - Identify all URL paths.
    - Extract request body schemas (primarily looking for **Zod** definitions).
    - Identify response structures (success and error types).
    - Identify complex object types and their structures to be reused across multiple endpoints.
3. **Generate**: The agent produces/updates a `master_of_game_UI/src/api/contracts/api_contract.json` file.
4. **Verify**: The agent confirms that all new or modified routes are included in the contract.

## Extraction Rules

- **Routes**: Extract the full relative path from the root.
- **Methods**: Standardize to uppercase (e.g., `GET`, `POST`).
- **Request Schemas**:
    - If a Zod schema is found for a request body, use its properties to define the contract.
    - If no schema is found, infer from the controller logic (if possible) or mark as `any` if unclear.
- **Response Schemas**:
    - Capture the main data object returned by the controller.
    - Include common fields like `message`, `status`, `errorCode`.
    - Use type references for complex objects (e.g., `"player": "Player"`).
- **Types**:
    - Define complex objects in a `types` section within the module.
    - Ensure types are reusable across different endpoints.
- **Groupings**: Group endpoints by their module (e.g., `auth`, `players`, `sessions`).

## Contract Format (JSON)

The generated `contracts/api_contract.json` must follow this structure:

```json
{
  "modules": {
    "auth": {
      "endpoints": [
        {
          "path": "/auth/login",
          "method": "POST",
          "description": "Authenticate user and return session cookie",
          "request": {
            "body": {
              "login": "string",
              "password": "string"
            }
          },
          "response": {
            "success": "boolean",
            "message": "string",
            "player": "Player"
          }
        }
      ],
      "types": {
        "Player": {
          "id": "number",
          "login": "string"
        }
      }
    }
  }
}
```

## Execution

Run the skill by describing the backend change or simply asking to "Sync API Contract".

Example:
`/skill:contract-extractor Sync the current backend routes to the contract.`
