-- =====================================================
-- Event Logs Table Creation Script
-- =====================================================
-- This script creates the event_logs table for tracking user interactions
-- in the NexSellPro Chrome extension. It includes Row Level Security (RLS)
-- to ensure users can only access their own event data.
-- 
-- Author: NexSellPro
-- Created: 2024-03-21
-- Last Modified: 2024-03-21
-- =====================================================

-- =====================================================
-- 1. CREATE THE EVENT_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS event_logs (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User identification (foreign key to auth.users)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'user_active',
        'session_start', 
        'session_end',
        'product_sourced',
        'buy_gauge_viewed',
        'variations_viewed', 
        'pricing_modified',
        'export_all_clicked',
        'export_filtered_clicked',
        'settings_opened',
        'settings_saved'
    )),
    
    -- Product context (optional)
    product_id VARCHAR(100),
    
    -- Session tracking
    session_id VARCHAR(100),
    
    -- Additional event metadata (JSONB for flexibility)
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Retry tracking for failed sends
    retry_count INTEGER DEFAULT 0,
    
    -- Processing status
    processed_at TIMESTAMPTZ,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for user-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);

-- Index for event type filtering
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_event_logs_session_id ON event_logs(session_id);

-- Index for product-based queries
CREATE INDEX IF NOT EXISTS idx_event_logs_product_id ON event_logs(product_id);

-- Composite index for user + event type queries
CREATE INDEX IF NOT EXISTS idx_event_logs_user_event ON event_logs(user_id, event_type);

-- Index for timestamp-based queries (analytics)
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at);

-- Index for processing status queries
CREATE INDEX IF NOT EXISTS idx_event_logs_processing_status ON event_logs(processing_status);

-- GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_event_logs_metadata ON event_logs USING GIN (metadata);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on the table
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Policy: Users can only see their own events
CREATE POLICY "Users can view own events" ON event_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert own events" ON event_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own events (for retry logic)
CREATE POLICY "Users can update own events" ON event_logs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own events (optional, for data cleanup)
CREATE POLICY "Users can delete own events" ON event_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 5. CREATE UPDATED_AT TRIGGER
-- =====================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER update_event_logs_updated_at 
    BEFORE UPDATE ON event_logs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get event statistics for a user
CREATE OR REPLACE FUNCTION get_user_event_stats(user_uuid UUID)
RETURNS TABLE (
    event_type VARCHAR(50),
    event_count BIGINT,
    last_occurrence TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        el.event_type,
        COUNT(*) as event_count,
        MAX(el.created_at) as last_occurrence
    FROM event_logs el
    WHERE el.user_id = user_uuid
    GROUP BY el.event_type
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session statistics for a user
CREATE OR REPLACE FUNCTION get_user_session_stats(user_uuid UUID)
RETURNS TABLE (
    session_id VARCHAR(100),
    session_start TIMESTAMPTZ,
    session_end TIMESTAMPTZ,
    event_count BIGINT,
    session_duration_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        el.session_id,
        MIN(el.created_at) as session_start,
        MAX(el.created_at) as session_end,
        COUNT(*) as event_count,
        EXTRACT(EPOCH FROM (MAX(el.created_at) - MIN(el.created_at))) / 60 as session_duration_minutes
    FROM event_logs el
    WHERE el.user_id = user_uuid 
        AND el.session_id IS NOT NULL
    GROUP BY el.session_id
    ORDER BY session_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. CREATE CLEANUP FUNCTION
-- =====================================================

-- Function to clean up old events (older than specified days)
CREATE OR REPLACE FUNCTION cleanup_old_events(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM event_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON event_logs TO authenticated;

-- Grant usage on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 9. COMMENTS AND DOCUMENTATION
-- =====================================================

-- Add comments to table and columns
COMMENT ON TABLE event_logs IS 'Stores user interaction events from the NexSellPro Chrome extension';
COMMENT ON COLUMN event_logs.id IS 'Unique identifier for each event';
COMMENT ON COLUMN event_logs.user_id IS 'Foreign key to auth.users - identifies the user who triggered the event';
COMMENT ON COLUMN event_logs.event_type IS 'Type of event that occurred (validated against predefined list)';
COMMENT ON COLUMN event_logs.product_id IS 'Walmart product ID if the event is product-related';
COMMENT ON COLUMN event_logs.session_id IS 'Session identifier for grouping related events';
COMMENT ON COLUMN event_logs.metadata IS 'Additional event data in JSON format';
COMMENT ON COLUMN event_logs.retry_count IS 'Number of times this event was retried during processing';
COMMENT ON COLUMN event_logs.processing_status IS 'Current status of event processing';
COMMENT ON COLUMN event_logs.processed_at IS 'Timestamp when event was successfully processed';

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Uncomment these queries to verify the setup:
/*
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'event_logs';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'event_logs';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'event_logs';
*/
