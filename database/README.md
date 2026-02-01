# Database Directory

This directory contains database-related files for schema management and data seeding.

## Structure

```
database/
├── migrations/      - Schema version control
├── seeders/         - Database seeding scripts
└── schema.sql       - Current schema snapshot (future)
```

## Migrations

Track database schema changes over time.

**Location**: `database/migrations/`

**Naming convention**: `YYYYMMDD_HHMMSS_description.sql`

**Example**:
```
001_create_users_table.sql
002_create_posts_table.sql
003_add_role_to_users.sql
```

**Future**: Add migration runner script

## Seeders

Populate database with sample or initial data.

**Location**: `database/seeders/`

**Files**:
- `seed-admin.js` - Create admin user
- `seed-user-test.js` - Create test users
- `index.js` - Run all seeders

### Running Seeders

**Run all seeders:**
```bash
npm run db:seed
```

**Run specific seeder:**
```bash
node database/seeders/seed-admin.js
```

### Creating a New Seeder

1. Create file: `database/seeders/seed-{name}.js`
2. Follow existing seeder pattern
3. Export default function if needed

## Schema Snapshot (Future)

**Location**: `database/schema.sql`

**Purpose**: Current state of database schema for reference

**Usage**:
- Quick reference for schema structure
- Easy setup for new developers
- Documentation of database design

## Integration with Supabase

Since you're using Supabase:

1. **Migrations**: Can be managed in Supabase dashboard or via SQL files here
2. **Seeders**: Run locally to populate Supabase database
3. **Schema**: Export from Supabase for documentation

## Best Practices

✅ **Version Control**: Track all schema changes
✅ **Idempotent Seeders**: Seeders should be safe to run multiple times
✅ **Test Data**: Use seeders for consistent test data
✅ **Documentation**: Document schema decisions in migration files
