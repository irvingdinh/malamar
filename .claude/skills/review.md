# /review - Comprehensive Code Review Skill

Review all uncommitted git changes in both server and UI packages with pedantic strictness.

## Trigger

Invoke with `/review` after completing a task to get a comprehensive code review before committing.

## Execution Steps

Execute these steps in order:

### Step 1: Get Changes

Run `git diff HEAD` to see all uncommitted changes. Note which files are modified in `server/` vs `ui/`.

### Step 2: Run Lint

Run lint for both packages and capture output:

```bash
cd server && bun run lint
cd ui && bun run lint
```

Flag any lint errors or warnings.

### Step 3: Run Tests

Run tests for both packages:

```bash
cd server && bun test
cd ui && bun run test  # if tests exist
```

Flag any test failures.

### Step 4: Run Build

Run build to verify the project is still buildable:

```bash
make build
```

After build completes, rollback the auto-generated imports file:

```bash
git checkout server/src/modules/ui/imports.ts
```

Flag any build errors. Also check for unusual log output during build.

### Step 5: Analyze Changes

Review the diff against all rules below. Be pedantic - flag everything.

### Step 6: Report Findings

Present findings organized by severity with file:line references.

---

## Review Rules

### Critical Severity

These MUST be fixed before committing:

#### Security Vulnerabilities
- **SQL Injection**: Raw string concatenation in SQL queries instead of prepared statements
- **Command Injection**: Unsanitized input passed to `Bun.spawn()` or shell commands
- **XSS**: Unescaped user input rendered in HTML/JSX
- **Credential Exposure**: API keys, passwords, secrets in code or config files
- **Path Traversal**: Unsanitized file paths that could access parent directories

#### Data Loss Risks
- Unchecked DELETE operations without confirmation
- Missing database transactions for multi-step operations
- Overwriting files without backup or confirmation

#### Breaking Changes
- Removed or renamed public API exports
- Changed API response structure without versioning
- Modified database schema without migration

---

### High Severity

Should be fixed before committing:

#### Logic Errors
- Off-by-one errors in loops or array access
- Null/undefined access without checks
- Race conditions in async code
- Incorrect boolean logic (missing negation, wrong operator)
- Dead code paths that can never execute

#### Missing Error Handling
- Unhandled promise rejections (missing `.catch()` or try-catch)
- Missing error responses for API endpoints
- Swallowed errors (empty catch blocks)
- Missing validation for user input

#### Type Safety Violations
- Usage of `any` type
- Unsafe type casts with `as` without validation
- Missing null checks before property access
- Non-exhaustive switch statements on union types

---

### Medium Severity

Should be addressed:

#### Performance Issues
- **Server**: N+1 queries, missing database indexes for frequent queries
- **Server**: Synchronous operations that should be async
- **UI**: Missing `useMemo`/`useCallback` for expensive computations
- **UI**: Unnecessary re-renders from inline object/array props
- **UI**: Large bundle imports that should be lazy loaded

#### Module Structure Violations (Server)
- Files not following `index.ts/routes.ts/service.ts/repository.ts/types.ts` pattern
- Business logic in routes (should be in service)
- Direct database access outside repository
- Missing re-exports in `index.ts`

#### Component Structure Violations (UI)
- Pages not in `pages/` directory or not named `*-page.tsx`
- Custom hooks not in `hooks/` directory or not named `use-*.ts`
- Feature components not in appropriate feature directories

#### API Design Issues
- Inconsistent HTTP status codes (should be: 200 GET/PUT, 201 POST, 204 DELETE)
- Missing request validation in service layer
- Inconsistent error response format
- Missing JSDoc on route handlers

---

### Low Severity

Nice to fix:

#### Code Hygiene
- `console.log()` or `console.debug()` statements (should use logger)
- `TODO`, `FIXME`, `HACK`, `XXX` comments indicating incomplete work
- Hardcoded magic numbers (should be named constants)
- Hardcoded URLs or API endpoints (should be in config)
- Commented-out code blocks

#### Style Inconsistencies
- **Naming**:
  - Server: camelCase for API types, snake_case for DB rows, SCREAMING_SNAKE for constants
  - UI: PascalCase for components, camelCase for functions/variables
- **Import order** (UI): External libs → `@/components/ui` → `@/components/layout` → `@/hooks` → `@/lib`
- Inconsistent spacing, indentation, or formatting (should be caught by lint)

#### Missing Documentation
- Public API functions without JSDoc comments
- Complex logic without explanatory comments
- Non-obvious regex patterns without explanation

---

## Server-Specific Rules

### Error Handling Pattern

Must use AppError subclasses from `core/errors.ts`:

```typescript
// Correct
throw new ValidationError('Name is required', { name: 'Name is required' })
throw new NotFoundError(`Workspace not found: ${id}`)

// Incorrect
throw new Error('Something went wrong')
```

### Database Access Pattern

Repository must use prepared statements with type generics:

```typescript
// Correct
db.query<WorkspaceRow, [string]>('SELECT * FROM workspaces WHERE id = ?').get(id)

// Incorrect
db.query(`SELECT * FROM workspaces WHERE id = '${id}'`).get()
```

### Validation Pattern

Validation happens in service layer with field-level details:

```typescript
// Correct (in service)
if (!data.name?.trim()) {
  throw new ValidationError('Validation failed', { name: 'Name is required' })
}

// Incorrect (validation in routes or repository)
```

### HTTP Response Pattern

```typescript
// GET/PUT: 200
return c.json(data)

// POST: 201
return c.json(data, 201)

// DELETE: 204
return c.body(null, 204)
```

---

## UI-Specific Rules

### React Hook Rules

- `useEffect` must have complete dependency arrays
- `useEffect` with subscriptions must return cleanup functions
- Custom hooks must follow `use*` naming convention
- Don't call hooks conditionally

### React Query Pattern

```typescript
// Correct
const { data, isError, isLoading } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetchResource(id),
  retry: 1,
  staleTime: 5000,
})

// Handle loading and error states
if (isLoading) return <Loading />
if (isError) return <Error />
```

### Component Props Pattern

```typescript
// Correct - explicit interface or React.ComponentProps
interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: 'default' | 'destructive'
}

// Avoid - any or implicit types
const Button = (props: any) => ...
```

### Accessibility Requirements

- Interactive elements (buttons, links) must be keyboard accessible
- Form inputs must have associated labels
- Images must have alt text
- Color must not be the only indicator of state
- Focus states must be visible

---

## CLAUDE.md Convention Enforcement

### No Over-Engineering

Flag if changes include:
- Abstractions for single-use code
- Helper functions used only once
- Feature flags for unreleased features
- Backwards-compatibility shims for code that could just be changed
- Extra configurability not requested
- Docstrings/comments added to unchanged code

### Test Coverage

New functionality should have corresponding tests:
- Server: Integration tests in `server/tests/` using factory helpers
- UI: Component tests if applicable

### Keep It Simple

- Prefer editing existing files over creating new ones
- Three similar lines > premature abstraction
- Only add error handling for scenarios that can actually happen

---

## Output Format

Present findings in this format:

```markdown
## Code Review Results

### Verification Steps
- [ ] Lint (server): PASS/FAIL - [details if failed]
- [ ] Lint (ui): PASS/FAIL - [details if failed]
- [ ] Tests (server): PASS/FAIL - [details if failed]
- [ ] Tests (ui): PASS/FAIL - [details if failed]
- [ ] Build: PASS/FAIL - [details if failed]
- [ ] Unusual logs: NONE/FOUND - [details if found]

### Findings

#### Critical (X issues)
- **[SECURITY]** `server/src/file.ts:42` - Description of issue
- **[DATA_LOSS]** `server/src/file.ts:88` - Description of issue

#### High (X issues)
- **[LOGIC]** `ui/src/file.tsx:15` - Description of issue
- **[ERROR_HANDLING]** `server/src/file.ts:33` - Description of issue

#### Medium (X issues)
- **[PERF]** `ui/src/file.tsx:22` - Description of issue
- **[STRUCTURE]** `server/src/file.ts:1` - Description of issue

#### Low (X issues)
- **[HYGIENE]** `server/src/file.ts:55` - Found console.log statement
- **[STYLE]** `ui/src/file.tsx:3` - Import order incorrect

### Summary
X critical, X high, X medium, X low issues found.
Recommendation: [BLOCK/FIX_BEFORE_COMMIT/OK_TO_COMMIT]
```

### Recommendation Guidelines

- **BLOCK**: Any critical issues found
- **FIX_BEFORE_COMMIT**: High severity issues or multiple medium issues
- **OK_TO_COMMIT**: Only low severity issues (or no issues)