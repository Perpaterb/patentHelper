-- Parenting Helper App - Database Schema
-- PostgreSQL 13+
-- Created: 2025-10-18
-- Description: Complete database schema for parenting/co-parenting coordination app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    kinde_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_subscribed BOOLEAN DEFAULT FALSE,
    subscription_id VARCHAR(255),
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    storage_limit_gb INTEGER DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_kinde_id ON users(kinde_id);

-- ============================================================================
-- GROUPS & MEMBERS
-- ============================================================================

CREATE TABLE groups (
    group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    background_image_url TEXT,
    background_color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_hidden BOOLEAN DEFAULT FALSE,
    date_format VARCHAR(50) DEFAULT 'MM/DD/YYYY',
    currency VARCHAR(3) DEFAULT 'USD',

    -- Trial restrictions (20-day free trial business rule)
    created_by_trial_user BOOLEAN DEFAULT FALSE,
    created_by_user_id UUID REFERENCES users(user_id),

    -- If TRUE, group can only have ONE admin until creating user subscribes
    -- Used to display warning banner to all group members
    -- After subscription, restriction lifted but flag remains for history

    CONSTRAINT chk_trial_creator CHECK (
        (created_by_trial_user = FALSE) OR
        (created_by_trial_user = TRUE AND created_by_user_id IS NOT NULL)
    )
);

CREATE INDEX idx_groups_created_at ON groups(created_at);

CREATE TABLE group_members (
    group_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    role VARCHAR(50) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    icon_letters VARCHAR(3) NOT NULL,
    icon_color VARCHAR(7) NOT NULL,
    email VARCHAR(255),
    is_registered BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_muted BOOLEAN DEFAULT FALSE,

    -- Notification preferences
    notify_requests BOOLEAN DEFAULT TRUE,
    notify_all_messages BOOLEAN DEFAULT TRUE,
    notify_mention_messages BOOLEAN DEFAULT TRUE,
    notify_all_calendar BOOLEAN DEFAULT TRUE,
    notify_mention_calendar BOOLEAN DEFAULT TRUE,
    notify_all_finance BOOLEAN DEFAULT TRUE,
    notify_mention_finance BOOLEAN DEFAULT TRUE,

    UNIQUE(group_id, user_id),
    CHECK (role IN ('admin', 'parent', 'child', 'caregiver', 'supervisor'))
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(group_id, role);

CREATE TABLE relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    member_id_1 UUID NOT NULL REFERENCES group_members(group_member_id),
    member_id_2 UUID NOT NULL REFERENCES group_members(group_member_id),
    relationship_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(group_id, member_id_1, member_id_2)
);

CREATE INDEX idx_relationships_group ON relationships(group_id);

CREATE TABLE group_settings (
    group_id UUID PRIMARY KEY REFERENCES groups(group_id) ON DELETE CASCADE,
    parents_create_message_groups BOOLEAN DEFAULT TRUE,
    children_create_message_groups BOOLEAN DEFAULT FALSE,
    caregivers_create_message_groups BOOLEAN DEFAULT TRUE,
    finance_visible_to_parents BOOLEAN DEFAULT TRUE,
    finance_creatable_by_parents BOOLEAN DEFAULT TRUE,
    finance_visible_to_caregivers BOOLEAN DEFAULT FALSE,
    finance_creatable_by_caregivers BOOLEAN DEFAULT FALSE,
    finance_visible_to_children BOOLEAN DEFAULT FALSE,
    finance_creatable_by_children BOOLEAN DEFAULT FALSE,

    -- Feature visibility controls (admins can hide entire features from dashboard)
    -- Adults = Parents, Caregivers, Supervisors (age 16+)
    adults_see_messages BOOLEAN DEFAULT TRUE,
    adults_see_calendar BOOLEAN DEFAULT TRUE,
    adults_see_finance BOOLEAN DEFAULT TRUE,
    adults_see_gift_registry BOOLEAN DEFAULT TRUE,
    adults_see_secret_santa BOOLEAN DEFAULT TRUE,
    adults_see_library BOOLEAN DEFAULT TRUE,
    adults_see_wiki BOOLEAN DEFAULT TRUE,
    adults_see_secure_documents BOOLEAN DEFAULT TRUE,

    -- Children (under 16)
    children_see_messages BOOLEAN DEFAULT TRUE,
    children_see_calendar BOOLEAN DEFAULT TRUE,
    children_see_finance BOOLEAN DEFAULT TRUE,
    children_see_gift_registry BOOLEAN DEFAULT TRUE,
    children_see_secret_santa BOOLEAN DEFAULT TRUE,
    children_see_library BOOLEAN DEFAULT TRUE,
    children_see_wiki BOOLEAN DEFAULT TRUE,
    children_see_secure_documents BOOLEAN DEFAULT TRUE,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_permissions (
    permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    granting_admin_id UUID NOT NULL REFERENCES group_members(group_member_id),
    receiving_admin_id UUID NOT NULL REFERENCES group_members(group_member_id),

    auto_approve_hide_messages BOOLEAN DEFAULT FALSE,
    auto_approve_add_people BOOLEAN DEFAULT FALSE,
    auto_approve_remove_people BOOLEAN DEFAULT FALSE,
    auto_approve_assign_roles BOOLEAN DEFAULT FALSE,
    auto_approve_change_roles BOOLEAN DEFAULT FALSE,
    auto_approve_assign_relationships BOOLEAN DEFAULT FALSE,
    auto_approve_change_relationships BOOLEAN DEFAULT FALSE,
    auto_approve_calendar_entries BOOLEAN DEFAULT FALSE,
    auto_approve_assign_children_to_events BOOLEAN DEFAULT FALSE,
    auto_approve_assign_caregivers_to_events BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(group_id, granting_admin_id, receiving_admin_id)
);

-- ============================================================================
-- MESSAGING
-- ============================================================================

CREATE TABLE message_groups (
    message_group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES group_members(group_member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP
);

CREATE INDEX idx_message_groups_group ON message_groups(group_id);
CREATE INDEX idx_message_groups_last_message ON message_groups(last_message_at);

CREATE TABLE message_group_members (
    message_group_id UUID NOT NULL REFERENCES message_groups(message_group_id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMP,

    PRIMARY KEY (message_group_id, group_member_id)
);

CREATE INDEX idx_msg_group_members_member ON message_group_members(group_member_id);

CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_group_id UUID NOT NULL REFERENCES message_groups(message_group_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES group_members(group_member_id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    is_hidden BOOLEAN DEFAULT FALSE,
    hidden_at TIMESTAMP,
    hidden_by UUID REFERENCES group_members(group_member_id),

    -- Message status tracking
    sent_status VARCHAR(20) DEFAULT 'pending',

    -- Mentions
    mentions UUID[] DEFAULT ARRAY[]::UUID[]
);

CREATE INDEX idx_messages_group ON messages(message_group_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_mentions ON messages USING GIN(mentions);

CREATE TABLE message_media (
    media_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size_bytes BIGINT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (media_type IN ('image', 'video'))
);

CREATE INDEX idx_message_media_message ON message_media(message_id);

CREATE TABLE message_read_receipts (
    message_id UUID NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (message_id, group_member_id)
);

CREATE INDEX idx_read_receipts_member ON message_read_receipts(group_member_id);

-- ============================================================================
-- CALENDAR & CHILD RESPONSIBILITY
-- ============================================================================

CREATE TABLE calendar_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES group_members(group_member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50),
    recurrence_interval INTEGER,
    recurrence_end_date TIMESTAMP,
    parent_event_id UUID REFERENCES calendar_events(event_id),

    -- Event type
    is_responsibility_event BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_calendar_events_group ON calendar_events(group_id);
CREATE INDEX idx_calendar_events_time ON calendar_events(start_time, end_time);
CREATE INDEX idx_calendar_events_recurring ON calendar_events(is_recurring, parent_event_id);

CREATE TABLE event_attendees (
    event_id UUID NOT NULL REFERENCES calendar_events(event_id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES group_members(group_member_id),

    PRIMARY KEY (event_id, group_member_id)
);

CREATE INDEX idx_event_attendees_member ON event_attendees(group_member_id);

CREATE TABLE child_responsibility_events (
    responsibility_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES calendar_events(event_id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES group_members(group_member_id),

    -- Responsibility at start
    start_responsibility_type VARCHAR(20) NOT NULL,
    start_responsible_member_id UUID REFERENCES group_members(group_member_id),
    start_responsible_other_name VARCHAR(255),
    start_responsible_other_icon_letters VARCHAR(3),
    start_responsible_other_color VARCHAR(7),

    -- Responsibility at end
    end_responsibility_type VARCHAR(20) NOT NULL,
    end_responsible_member_id UUID REFERENCES group_members(group_member_id),
    end_responsible_other_name VARCHAR(255),
    end_responsible_other_icon_letters VARCHAR(3),
    end_responsible_other_color VARCHAR(7),

    CHECK (start_responsibility_type IN ('no_change', 'change_to_end', 'member', 'other')),
    CHECK (end_responsibility_type IN ('no_change', 'change_to_end', 'member', 'other'))
);

CREATE INDEX idx_responsibility_events_event ON child_responsibility_events(event_id);
CREATE INDEX idx_responsibility_events_child ON child_responsibility_events(child_id);

-- ============================================================================
-- FINANCE MATTERS
-- ============================================================================

CREATE TABLE finance_matters (
    finance_matter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    due_date TIMESTAMP,
    created_by UUID NOT NULL REFERENCES group_members(group_member_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_settled BOOLEAN DEFAULT FALSE,
    settled_at TIMESTAMP,
    settled_by UUID REFERENCES group_members(group_member_id)
);

CREATE INDEX idx_finance_matters_group ON finance_matters(group_id);
CREATE INDEX idx_finance_matters_settled ON finance_matters(is_settled);

CREATE TABLE finance_matter_members (
    finance_matter_id UUID NOT NULL REFERENCES finance_matters(finance_matter_id) ON DELETE CASCADE,
    group_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    expected_amount DECIMAL(12, 2) NOT NULL,
    expected_percentage DECIMAL(5, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,

    PRIMARY KEY (finance_matter_id, group_member_id)
);

CREATE INDEX idx_finance_members_member ON finance_matter_members(group_member_id);

CREATE TABLE finance_payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finance_matter_id UUID NOT NULL REFERENCES finance_matters(finance_matter_id) ON DELETE CASCADE,
    from_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    to_member_id UUID NOT NULL REFERENCES group_members(group_member_id),
    amount DECIMAL(12, 2) NOT NULL,
    receipt_image_url TEXT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    is_confirmed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_finance_payments_matter ON finance_payments(finance_matter_id);
CREATE INDEX idx_finance_payments_members ON finance_payments(from_member_id, to_member_id);

-- ============================================================================
-- APPROVALS & VOTING
-- ============================================================================

CREATE TABLE approvals (
    approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    approval_type VARCHAR(50) NOT NULL,
    requested_by UUID NOT NULL REFERENCES group_members(group_member_id),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMP,

    -- Related entity IDs
    related_entity_type VARCHAR(50),
    related_entity_id UUID,

    -- Approval data (JSON for flexibility)
    approval_data JSONB NOT NULL,

    -- Voting requirements
    requires_all_admins BOOLEAN DEFAULT FALSE,
    required_approval_percentage DECIMAL(5, 2) DEFAULT 50.00,

    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE INDEX idx_approvals_group ON approvals(group_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_requester ON approvals(requested_by);

CREATE TABLE approval_votes (
    approval_id UUID NOT NULL REFERENCES approvals(approval_id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES group_members(group_member_id),
    vote VARCHAR(10) NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (approval_id, admin_id),
    CHECK (vote IN ('approve', 'reject'))
);

CREATE INDEX idx_approval_votes_admin ON approval_votes(admin_id);

-- ============================================================================
-- AUDIT LOGGING & TRACKING
-- ============================================================================

CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    action_location VARCHAR(255),
    performed_by UUID REFERENCES group_members(group_member_id),
    performed_by_name VARCHAR(255),
    performed_by_email VARCHAR(255),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Message-specific fields
    message_content TEXT,
    media_links TEXT[],

    -- Additional context (JSON for flexibility)
    log_data JSONB
);

CREATE INDEX idx_audit_logs_group ON audit_logs(group_id);
CREATE INDEX idx_audit_logs_performed_at ON audit_logs(group_id, performed_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);

CREATE TABLE media_log_links (
    link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_export_id UUID NOT NULL,
    media_id UUID NOT NULL REFERENCES message_media(media_id),
    access_token VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    accessed_count INTEGER DEFAULT 0
);

CREATE INDEX idx_media_log_links_export ON media_log_links(log_export_id);
CREATE INDEX idx_media_log_links_expires ON media_log_links(expires_at);

CREATE TABLE storage_usage (
    usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    file_count INTEGER DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, group_id, media_type)
);

CREATE INDEX idx_storage_usage_user ON storage_usage(user_id);
CREATE INDEX idx_storage_usage_group ON storage_usage(group_id);

CREATE TABLE pinned_items (
    pin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id UUID NOT NULL,
    pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pin_order INTEGER NOT NULL,

    UNIQUE(user_id, item_type, item_id)
);

CREATE INDEX idx_pinned_items_user ON pinned_items(user_id, item_type, pin_order);

-- ============================================================================
-- COMMENTS & NOTES
-- ============================================================================

-- Role types: 'admin', 'parent', 'child', 'caregiver', 'supervisor'
-- Message status: 'pending', 'sent', 'delivered', 'failed'
-- Approval status: 'pending', 'approved', 'rejected', 'cancelled'
-- Approval votes: 'approve', 'reject'
-- Media types: 'image', 'video'
-- Responsibility types: 'no_change', 'change_to_end', 'member', 'other'
-- Recurrence patterns: 'daily', 'weekly', 'monthly', 'yearly'

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
