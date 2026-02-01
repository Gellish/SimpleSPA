# Controllers Directory

This directory contains all HTTP controllers.

## Structure

```
app/Controllers/
├── ApiHandler.js        - API router registration (entry point)
├── AuthController.js    - Authentication operations
├── AdminController.js   - Admin/user management
├── EventController.js   - Event store operations (CQRS)
└── FileController.js    - File operations
```

## Controller Pattern

Each controller is a class with methods for handling requests:

```javascript
export default class MyController {
  async methodName(req, res) {
    const ctx = createContext(req, res);
    
    try {
      // Get request data
      const data = await ctx.request.body();
      
      // Process logic
      const result = await someService.doSomething(data);
      
      // Return response
      return ctx.response.json(result);
    } catch (error) {
      return ctx.response.error(error);
    }
  }
}
```

## Controllers

### AuthController
**Purpose**: Handle authentication

**Routes**:
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

**Methods**:
- `login(req, res)` - Authenticate user
- `logout(req, res)` - End user session

### AdminController
**Purpose**: Admin operations (user management)

**Routes**:
- `POST /admin/create-user` - Create new user (admin only)
- `POST /admin/update-user` - Update user profile (admin only)

**Methods**:
- `createUser(req, res)` - Create user via Supabase Admin API
- `updateUser(req, res)` - Update user profile and metadata

### EventController
**Purpose**: Event store operations (CQRS/Event Sourcing)

**Routes**:
- `GET /events?type=page&id=123` - Get events for aggregate
- `POST /events` - Create new event
- `POST /events/delete` - Delete aggregate
- `GET /aggregates?type=page` - Get all aggregates with state

**Methods**:
- `index(req, res)` - List events
- `store(req, res)` - Create event
- `destroy(req, res)` - Delete aggregate
- `aggregates(req, res)` - Get aggregates with projected state

### FileController
**Purpose**: File operations (save, delete)

**Routes**:
- `POST /save` - Save file content
- `POST /delete` - Delete file

**Methods**:
- `save(req, res)` - Write file to disk
- `delete(req, res)` - Remove file from disk
- `validatePath(filePath)` - Security validation

## HTTP Context

Controllers use a simplified context pattern:

```javascript
const ctx = createContext(req, res);

// Request
await ctx.request.body()           // Parse JSON body
ctx.request.query(url)             // Get query params
ctx.request.method                 // HTTP method
ctx.request.headers                // Request headers

// Response
ctx.response.json(data)            // Send JSON (200)
ctx.response.status(code).json()   // Send with status code
ctx.response.error(error, code)    // Send error response
```

## Adding New Controllers

1. **Create controller file**:
```javascript
// app/Controllers/MyController.js
export default class MyController {
  async myAction(req, res) {
    const ctx = createContext(req, res);
    // ... implementation
  }
}
```

2. **Add routes**:
```javascript
// app/Lib/server/routes.js
{ method: 'GET', path: '/my-route', controller: 'MyController', action: 'myAction' }
```

3. **Register controller**:
```javascript
// app/Lib/server/api-router.js
import MyController from '../../Controllers/MyController.js';

const controllers = {
  MyController: new MyController(),
  // ... other controllers
};
```

## Best Practices

✅ **Single Responsibility**: One controller per domain
✅ **Thin Controllers**: Delegate business logic to services
✅ **Error Handling**: Use try/catch in every action
✅ **Validation**: Validate input data
✅ **Security**: Validate file paths, check permissions

## Testing

Controllers can be tested independently:

```javascript
import { describe, it, expect } from 'vitest';
import AuthController from '@app/Controllers/AuthController.js';

describe('AuthController', () => {
  it('should login user', async () => {
    const controller = new AuthController();
    // Mock req/res and test
  });
});
```

## Migration from Old ApiHandler

**Before** (168 lines, everything mixed):
```javascript
export function registerApiHandlers(server) {
  server.middlewares.stack.unshift({
    handle: async (req, res, next) => {
      if (req.method === 'POST' && pathReq === '/auth/login') {
        // 20 lines of logic...
      }
      // ... 140 more lines
    }
  });
}
```

**After** (18 lines, clean separation):
```javascript
export function registerApiHandlers(server) {
  registerApiRouter(server);
}
```

Logic is now in separate, testable, maintainable controllers!
