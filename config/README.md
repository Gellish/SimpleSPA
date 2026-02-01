# Configuration Directory

This directory contains all application configuration files, following AdonisJS v6 conventions.

## Files

### `app.js`
Core application settings:
- Application name, URL, environment
- Debug mode, port, locale, timezone
- All values loaded from `.env` with defaults

### `database.js`
Database connection configuration:
- Supabase settings (URL, keys, options)
- Firebase settings (legacy, can be removed)
- Connection options and defaults

### `auth.js`
Authentication and authorization:
- Auth provider selection
- Session configuration
- Password requirements
- User roles
- OAuth providers (Google, GitHub)
- Redirect URLs

### `api.js`
API configuration:
- Provider selection (auth, posts, users)
- Base URLs for different providers
- Timeouts and rate limiting
- CORS settings

### `index.js`
Central export point for all configs.

## Usage

### Import all configs:
```javascript
import config from '/config/index.js';

console.log(config.app.name);
console.log(config.database.supabase.url);
```

### Import specific configs:
```javascript
import { app, database, auth } from '/config/index.js';

console.log(app.name);
console.log(database.supabase.url);
console.log(auth.provider);
```

### Import individual config file:
```javascript
import appConfig from '/config/app.js';

console.log(appConfig.name);
```

## Environment Variables

All configuration values can be overridden using environment variables in `.env`:

### App Configuration
- `APP_NAME` - Application name (default: "My App")
- `APP_URL` - Base URL (default: "http://localhost:5175")
- `NODE_ENV` - Environment (development/production/test)
- `DEBUG` - Enable debug mode (true/false)
- `PORT` - Server port (default: 5175)
- `APP_LOCALE` - Default language (default: "en")
- `APP_TIMEZONE` - Default timezone (default: "UTC")

### Database Configuration
- `DB_CONNECTION` - Default connection (default: "supabase")
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (⚠️ keep secret!)

### Auth Configuration
- `API_AUTH_PROVIDER` - Auth provider (supabase/firebase/rest)
- `SESSION_LIFETIME` - Session duration in seconds (default: 604800)
- `PASSWORD_MIN_LENGTH` - Minimum password length (default: 8)
- `ADMIN_EMAIL` - Default admin email
- `ADMIN_PASSWORD` - Default admin password

### API Configuration
- `API_POSTS_PROVIDER` - Posts data provider
- `API_USERS_PROVIDER` - Users data provider
- `API_TIMEOUT` - Request timeout in ms (default: 30000)
- `CORS_ORIGINS` - Allowed CORS origins (comma-separated)

## Benefits

✅ **Centralized Configuration** - All settings in one place
✅ **Type Safety** - Clear structure and documentation
✅ **Environment-Aware** - Easy to override per environment
✅ **AdonisJS-Style** - Follows framework conventions
✅ **Maintainable** - Easy to find and update settings
