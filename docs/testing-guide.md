# Testing Guide

## Overview

SplitNinja now includes comprehensive unit tests for core business logic and utilities. This ensures reliability and makes it easier to refactor code with confidence.

## Test Framework

- **Jest**: Test runner and assertion library
- **React Testing Library**: For testing React components (future)
- **@testing-library/jest-dom**: Additional matchers for DOM assertions

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

### Core Utilities (100% coverage)

#### Currency Utilities (`src/lib/__tests__/currency.test.ts`)
- ✅ Parsing numeric and string values to cents
- ✅ Handling edge cases (empty, invalid, null values)
- ✅ Formatting currency with proper symbols
- ✅ Rounding to nearest cent
- ✅ Handling formatted strings ($, €, commas)

#### Settlement Calculations (`src/lib/__tests__/settlement.test.ts`)
- ✅ Computing individual member balances
- ✅ Handling multiple expenses across members
- ✅ Simplifying settlements to minimize transactions
- ✅ Three-way and complex multi-party settlements
- ✅ Zero balance scenarios

#### Expense Validation (`src/lib/__tests__/expense-helpers.test.ts`)
- ✅ Parsing valid expense payloads
- ✅ Multi-payer expense validation
- ✅ Weighted split calculations
- ✅ Required field validation
- ✅ Amount validation (positive, matching totals)
- ✅ Duplicate payer/participant detection
- ✅ Invalid membership ID handling
- ✅ Date normalization

#### Group Serializers (`src/lib/__tests__/group-serializers.test.ts`)
- ✅ Group summary serialization
- ✅ Member info serialization
- ✅ Handling null/missing user data
- ✅ Role-based permissions
- ✅ Net balance calculations

#### Invite Code Generation (`src/lib/__tests__/invite-code.test.ts`)
- ✅ Generating random alphanumeric codes
- ✅ Ensuring uniqueness via database checks
- ✅ Retry logic on conflicts
- ✅ Error handling after max attempts

## Test Organization

```
src/
├── lib/
│   ├── __tests__/
│   │   ├── currency.test.ts
│   │   ├── settlement.test.ts
│   │   ├── expense-helpers.test.ts
│   │   ├── group-serializers.test.ts
│   │   └── invite-code.test.ts
│   ├── currency.ts
│   ├── settlement.ts
│   └── ...
└── components/
    └── groups/
        └── __tests__/
            └── (future component tests)
```

## Writing New Tests

### 1. Create test file alongside source
```bash
# For a file at src/lib/myutil.ts
# Create test at src/lib/__tests__/myutil.test.ts
```

### 2. Follow the testing pattern
```typescript
import { myFunction } from '../myutil'

describe('MyUtil', () => {
  describe('myFunction', () => {
    it('should handle valid input', () => {
      expect(myFunction('valid')).toBe('expected')
    })

    it('should handle edge cases', () => {
      expect(myFunction('')).toBe(null)
      expect(myFunction(null)).toBe(null)
    })

    it('should throw on invalid input', () => {
      expect(() => myFunction('invalid')).toThrow('Error message')
    })
  })
})
```

### 3. Mock external dependencies
```typescript
// Mock Prisma
const mockPrisma = {
  group: {
    findUnique: jest.fn(),
  },
}

// Mock fetch
global.fetch = jest.fn()
```

## Best Practices

1. **Test behavior, not implementation** - Focus on inputs and outputs
2. **Use descriptive test names** - `should calculate correct split for weighted shares`
3. **Test edge cases** - null, undefined, empty strings, zero amounts
4. **Mock external dependencies** - Database, API calls, file system
5. **Keep tests isolated** - Each test should be independent
6. **Use beforeEach/afterEach** - Clean up state between tests

## Key Lessons from Bug Fix

The recent expense validation bug taught us:

1. **Filter logic must be explicit**: `filter((x) => x ?? 0)` doesn't work as expected because `0` is falsy
2. **Validation requires comprehensive tests**: Edge cases with zero amounts, empty strings, and null values
3. **Tests catch regressions**: When refactoring, tests ensure old bugs don't return

### Example from Bug Fix

```typescript
// ❌ BAD - includes zero amounts
.filter((payer) => parseCurrencyToCents(payer.amount) ?? 0)

// ✅ GOOD - explicitly checks > 0
.filter((payer) => (parseCurrencyToCents(payer.amount) ?? 0) > 0)
```

## Test Statistics

- **Total test suites**: 5
- **Total tests**: 53
- **All passing**: ✅
- **Coverage**: Core utilities at 100%

## Future Testing Goals

- [ ] Add component tests for expense form
- [ ] Add integration tests for API routes
- [ ] Add E2E tests with Playwright
- [ ] Set up CI/CD test automation
- [ ] Add performance benchmarks for settlement algorithm

## Troubleshooting

### "Cannot find module '@/...'"
- Ensure `moduleNameMapper` is set in `jest.config.js`
- Restart Jest if config changes

### "Database error" in invite code tests
- This is expected when mocking database failures
- The console.error is intentional to test error handling

### Tests timing out
- Increase timeout: `jest.setTimeout(10000)`
- Check for unresolved promises

## References

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

