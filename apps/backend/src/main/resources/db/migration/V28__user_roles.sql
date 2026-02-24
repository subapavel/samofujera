-- Create user_roles junction table for multi-role support
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    VARCHAR(20) NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- Migrate existing roles from users.role column
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM users;

-- Existing ADMINs also get SUPERADMIN
INSERT INTO user_roles (user_id, role)
SELECT id, 'SUPERADMIN' FROM users WHERE role = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Drop old single-role column
ALTER TABLE users DROP COLUMN role;
