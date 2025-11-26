# Error Handling Guide

Comprehensive error handling system for the Outside Observations application. This guide covers what was implemented, how it works, and how to use it.

---

## Overview

The application uses a multi-layered error handling approach to prevent crashes and provide user-friendly error messages. Errors are caught at different levels and handled gracefully, ensuring the app remains functional even when things go wrong.

---

## Architecture

### Three Layers of Error Protection

1. **Error Boundaries** (React Component Level)
   - Catches JavaScript errors during rendering, lifecycle methods, or constructors
   - Prevents white screen of death
   - Isolates failures so one component crash doesn't break the entire app

2. **Try-Catch Blocks** (Async/API Level)
   - Catches network errors, API failures, data parsing errors
   - Returns safe defaults instead of throwing
   - Provides user-friendly error messages

3. **Validation & Fallbacks** (Prevention Level)
   - Validates data before use
   - Provides safe defaults (empty arrays, null values)
   - Prevents errors from happening in the first place

---

## Components

### ErrorBoundary (`src/app/_components/ErrorBoundary.js`)
**Type**: Client Component (React Error Boundary)

**Features**:
- Catches JavaScript errors in child component tree
- Displays fallback UI instead of crashing
- Logs errors to console in development
- Provides reset functionality
- Supports custom fallback UI via component or function props
- Shows error details in development mode

**Usage**:
```jsx
// With component fallback (for server components)
<ErrorBoundary fallback={ArchiveErrorFallback}>
  <ArchiveListContent />
</ErrorBoundary>

// With function fallback (for client components)
<ErrorBoundary fallback={(error, reset) => <CustomErrorUI />}>
  <YourComponent />
</ErrorBoundary>
```

---

### ErrorDisplay (`src/app/_components/ErrorDisplay.js`)
**Type**: Client Component

**Components**:
- **`ErrorDisplay`**: Full-page error display with title, message, and actions
- **`InlineError`**: Small inline error message for forms/inputs
- **`LoadingError`**: Specialized error for loading failures

**Props**:
- `title`: Error title (default: "Something went wrong")
- `message`: Error message
- `error`: Error object (shown in development only)
- `onRetry`: Retry callback function
- `retryLabel`: Label for retry button (default: "Try again")
- `showHomeLink`: Show home link (default: true)
- `className`: Additional CSS classes

**Features**:
- User-friendly error messages
- Retry functionality
- Home link option
- Development error details
- Accessible (ARIA attributes)
- Styled to match site design system

---

### ErrorFallbacks (`src/app/_components/ErrorFallbacks.js`)
**Type**: Client Components

Pre-built fallback components for common error scenarios:
- `ArchiveEntryErrorFallback` - Archive entry page errors
- `ArchiveErrorFallback` - Archive page errors
- `HomeErrorFallback` - Home page errors
- `ChatErrorFallback` - Chat interface errors
- `ArchiveListErrorFallback` - Archive list errors

These are used by server components (which can't pass functions to client components).

---

## Implementation Details

### Data Fetching (`src/app/_data/archive.js`)

All data fetching functions are wrapped in try-catch blocks and return safe defaults:

```javascript
const fetchArchiveEntries = async () => {
  try {
    const entries = await client.fetch(ARCHIVE_ENTRIES_QUERY);
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries;
  } catch (error) {
    console.error('Failed to fetch archive entries:', error);
    return []; // Safe fallback
  }
};
```

**Benefits**:
- App continues to function even if Sanity API is down
- Empty states are handled gracefully
- No crashes from data fetching failures

---

### Component Error Handling

#### ChatBox (`src/app/_components/Home/ChatBox.js`)

**Error Types Handled**:
- Network errors (connection failures)
- API errors (server errors)
- Timeout errors
- JSON parsing errors

**Error Messages**:
- Network: "Unable to connect to the server. Please check your internet connection."
- Timeout: "Request timed out. Please try again."
- API: Uses error message from API response
- Generic: "Sorry, I encountered an error. Please try again."

---

#### ArchiveEntriesProvider (`src/app/_components/Archive/ArchiveEntriesProvider.js`)

**Error Handling**:
- Validates initial entries array
- Wraps entry multiplication in try-catch
- Improved error handling in `runSearch`
- Better error messages (network, timeout, etc.)
- Handles JSON parsing errors
- Validates response structure

---

### Page-Level Error Handling

#### Archive Entry Page (`src/app/(pages)/archive/entry/[slug]/page.js`)

**Error Handling**:
- Try-catch for params resolution
- Try-catch for entry fetching
- Validates entry has required fields
- Wrapped in ErrorBoundary
- Shows 404 for missing entries

---

#### Root Layout (`src/app/(pages)/layout.js`)

**Error Handling**:
- Try-catch for headers reading
- Try-catch for data fetching
- Try-catch for cookie reading
- Error boundaries around all major sections
- Graceful fallbacks for all failures

---

## How It Works

### Example: ChatBox Network Error Flow

```
1. User types message and clicks Send
   ↓
2. Loading message appears
   ↓
3. fetch('/api/vector-store/query') is called
   ↓
4. ❌ Network error occurs
   ↓
5. catch block detects error type
   - Checks: error instanceof TypeError && error.message.includes('fetch')
   - Sets user-friendly error message
   ↓
6. Loading message replaced with error message
   - User sees: "Unable to connect to the server..."
   ↓
7. User can retry or continue using the app
```

---

### Example: Component Crash Flow

```
1. Component tries to render
   ↓
2. ❌ Error occurs (e.g., null.property)
   ↓
3. ErrorBoundary catches it
   ↓
4. ErrorBoundary shows fallback UI
   - Custom fallback if provided
   - Default ErrorDisplay otherwise
   ↓
5. Rest of app continues to work
   ↓
6. User can click "Try again" to retry
```

---

### Example: Data Fetching Error Flow

```
1. Page tries to fetch data from Sanity
   ↓
2. ❌ Sanity API is down
   ↓
3. Try-catch catches error
   ↓
4. Returns empty array (safe default)
   ↓
5. Page renders with empty state
   ↓
6. User can still navigate and use other features
```

---

## Error Recovery

### User Experience

1. **Error Occurs** → User sees friendly message
2. **User Clicks "Try Again"** → Action retries
3. **If Error Boundary** → Component re-renders from scratch
4. **If Try-Catch** → Function retries

### Example: Search Error Recovery

```javascript
// User searches, gets error
searchStatus = {
  status: 'error',
  error: 'Network error. Please check your connection.'
}

// User sees error message in search panel
<InlineError message="Search failed: Network error..." />

// User modifies query and searches again
// runSearch() is called again
// If successful this time, error is cleared
```

---

## Error Display Hierarchy

### 1. Inline Errors (Small, Contextual)
Used in forms and small spaces:
```jsx
<InlineError message="Search failed: Network error" />
```

### 2. Component-Level Errors (Medium, Section)
Used for section-specific errors:
```jsx
<div className={styles.errorBanner}>
  Search error: {errorMessage}
</div>
```

### 3. Full-Page Errors (Large, Critical)
Used when entire component fails:
```jsx
<ErrorDisplay
  title="Unable to load archive"
  message="There was an error loading the archive..."
  onRetry={reset}
/>
```

---

## Styling

All error components use CSS modules and match the site's design system:

- **Colors**: Uses CSS variables (`--bg-color`, `--fg-color`, `--gray-color`)
- **Typography**: Matches site font (courier monospace)
- **Spacing**: Uses design system padding and margins
- **Buttons**: Matches site button styles
- **Transitions**: Uses site transition system

**File**: `src/app/_assets/error.module.css`

---

## Files Modified

1. ✅ `src/app/_components/ErrorBoundary.js` (created)
2. ✅ `src/app/_components/ErrorDisplay.js` (created)
3. ✅ `src/app/_components/ErrorFallbacks.js` (created)
4. ✅ `src/app/_data/archive.js`
5. ✅ `src/app/(pages)/layout.js`
6. ✅ `src/app/(pages)/archive/entry/[slug]/page.js`
7. ✅ `src/app/(pages)/archive/page.js`
8. ✅ `src/app/_components/Archive/ArchiveListContent.js`
9. ✅ `src/app/_components/Archive/ArchiveEntriesProvider.js`
10. ✅ `src/app/_components/Archive/Navigation/ArchiveNavigationSearchPanel.js`
11. ✅ `src/app/_components/Home/ChatBox.js`
12. ✅ `src/app/_components/Home/HomeContent.js`
13. ✅ `src/app/_assets/error.module.css` (created)
14. ✅ `src/app/_assets/archive/archive-page.module.css`

---

## Best Practices

### When Adding New Features

1. **Wrap in Error Boundary**:
   ```jsx
   <ErrorBoundary fallback={YourErrorFallback}>
     <YourNewComponent />
   </ErrorBoundary>
   ```

2. **Add Try-Catch for Async**:
   ```javascript
   try {
     const data = await fetchData();
     // Use data
   } catch (error) {
     // Show error message
     setError(error.message);
   }
   ```

3. **Validate Data**:
   ```javascript
   const safeData = Array.isArray(data) ? data : [];
   ```

4. **Provide Fallbacks**:
   ```javascript
   const result = data?.value ?? defaultValue;
   ```

---

## Future Improvements

### Potential Enhancements

1. **Error Reporting Service**
   - Integrate Sentry or similar
   - Track errors in production
   - Get notified of critical errors

2. **Retry Logic**
   - Automatic retry for transient failures
   - Exponential backoff
   - Max retry limits

3. **Offline Support**
   - Service worker for offline functionality
   - Cache error states
   - Queue actions for when online

4. **Error Analytics**
   - Track error frequency
   - Identify common failure points
   - Monitor error trends

---

## Summary

The error handling system ensures:
- ✅ App never shows white screen of death
- ✅ Errors are caught at multiple levels
- ✅ User-friendly error messages
- ✅ Users can recover from errors
- ✅ Partial functionality maintained when errors occur
- ✅ Errors logged for debugging
- ✅ Styled to match site design

All error handling follows React and Next.js best practices, ensuring the application remains stable and user-friendly even when things go wrong.

