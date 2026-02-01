# Start Directory

This directory contains application bootstrapping and initialization files.

## Purpose

The `start/` directory is loaded during application startup and contains:
- Environment configuration
- Route definitions
- Application kernel/lifecycle hooks
- Global middleware registration

## Files

### `kernel.js`
**Purpose**: Application bootstrapping and lifecycle management

**Contains**:
- Application initialization logic
- Global service setup
- Lifecycle hooks (boot, shutdown)

**Usage**:
```javascript
import kernel from './start/kernel.js';
await kernel.boot();
```

### `env.js`
**Purpose**: Environment variable management and validation

**Contains**:
- Environment variable loading
- Required variable validation
- Helper functions for accessing env vars

**Usage**:
```javascript
import { env, validateEnv } from './start/env.js';

validateEnv(); // Throws if required vars missing
const apiUrl = env('API_URL', 'http://localhost:3000');
```

### `routes.js`
**Purpose**: Route definitions (placeholder for future use)

**Current State**: 
- Your routing is handled by Vite middleware (`vite.config.js`)
- SPA routing in `app/Lib/server/spa-router.js`
- Client-side navigation in `resources/assets/js/spa-frame.js`

**Future Use**:
- Define API routes
- Server-side route configuration
- Route middleware

## When to Use

### `kernel.js`
- Application startup logic
- Global service initialization
- Database connections (if needed)

### `env.js`
- Access environment variables safely
- Validate required configuration
- Centralized env management

### `routes.js`
- Future: API route definitions
- Currently: Handled by Vite middleware

## Best Practices

✅ **Keep it minimal**: Only essential startup logic
✅ **Validate early**: Check env vars at startup
✅ **Document dependencies**: Note what services are initialized
✅ **Fail fast**: Throw errors for missing config

## Integration

These files are loaded by:
1. **Development**: Vite dev server (`vite.config.js`)
2. **Production**: Build process (`npm run build`)
3. **Tests**: Test setup (`tests/setup.js`)

Your current setup works great for a SPA! The `start/` directory is now properly structured.
