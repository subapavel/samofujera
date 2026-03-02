CREATE TABLE email_template_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key VARCHAR(100) NOT NULL,
    locale VARCHAR(5) NOT NULL,
    custom_subject VARCHAR(500),
    custom_body_html TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_email_template_overrides UNIQUE (template_key, locale)
);
