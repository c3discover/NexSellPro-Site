# Analytics Feature Documentation

## Overview
The dashboard now includes a simple analytics section that displays user activity metrics from the Chrome extension usage.

## Features

### Analytics Cards
The analytics section shows four key metrics:

1. **Minutes This Week** - Total time spent sourcing products in the last 7 days
2. **Products Today** - Number of products analyzed today
3. **Total Analyzed** - All-time count of products analyzed
4. **Day Streak** - Current consecutive days of activity (placeholder for future)

### Data Sources
- **event_logs** table in Supabase
- **session_end** events with metadata.sessionLength for time tracking
- **product_sourced** events for product analysis counts

### Implementation Details

#### State Management
```typescript
const [analytics, setAnalytics] = useState({
  minutesSourcingThisWeek: 0,
  productsAnalyzedToday: 0,
  totalProductsAnalyzed: 0,
  currentStreak: 0
});
const [analyticsLoading, setAnalyticsLoading] = useState(false);
```

#### Data Fetching
- Fetches data when user is authenticated
- Uses Supabase queries with proper error handling
- Includes loading states for better UX

#### UI Components
- Conditional rendering (only shows if user has analyzed products)
- Responsive grid layout (1-4 columns based on screen size)
- Consistent styling with existing dashboard theme
- Loading animations for better user experience

## Database Schema
The analytics rely on the `event_logs` table with the following key fields:
- `user_id` - Links to authenticated user
- `event_type` - Type of event (session_end, product_sourced, etc.)
- `metadata` - JSONB field containing additional data (sessionLength)
- `created_at` - Timestamp for date-based queries

## Future Enhancements
- Day streak calculation
- More detailed analytics (profit margins, success rates)
- Export functionality for analytics data
- Historical trends and charts

## Testing
1. Dashboard loads without errors
2. Analytics cards show correct data when user has activity
3. Loading states work properly
4. Error handling gracefully falls back to zero values
5. Conditional rendering works (hidden when no data)
