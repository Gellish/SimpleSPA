# Tests Directory

This directory contains all automated tests for the application.

## Structure

```
tests/
├── unit/            - Unit tests (isolated function/class tests)
├── integration/     - Integration tests (API, database, services)
└── setup.js         - Global test configuration
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (auto-rerun on changes)
```bash
npm test -- --watch
```

### With UI
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test File
```bash
npm test tests/unit/event-store.test.js
```

## Writing Tests

### Unit Tests

**Location**: `tests/unit/`

**Purpose**: Test individual functions/classes in isolation

**Example**:
```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@app/Lib/myModule.js';

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Tests

**Location**: `tests/integration/`

**Purpose**: Test multiple components working together

**Example**:
```javascript
import { describe, it, expect } from 'vitest';
import { authService } from '@app/Services/index.js';

describe('Authentication Flow', () => {
  it('should login user successfully', async () => {
    const result = await authService.login({
      email: 'test@example.com',
      password: 'password'
    });
    
    expect(result.user).toBeDefined();
  });
});
```

## Test Utilities

**Location**: `tests/setup.js`

**Global utilities** available in all tests:
- `testUtils.createTestUser()` - Create test user object
- `testUtils.createTestPost()` - Create test post object

## Best Practices

✅ **Descriptive names**: Test names should describe what they test
✅ **One assertion per test**: Keep tests focused
✅ **Arrange-Act-Assert**: Structure tests clearly
✅ **Clean up**: Remove test data after tests
✅ **Mock external services**: Don't hit real APIs in tests

## Coverage Goals

- **Unit tests**: Aim for 80%+ coverage of business logic
- **Integration tests**: Cover critical user flows
- **Event store**: 100% coverage (critical functionality)

## Continuous Integration

Tests run automatically on:
- Git commits (pre-commit hook - future)
- Pull requests (CI/CD - future)
- Before deployment (future)
