# Implementation Plan - Reports Page Overall Responsiveness (400px Fix)

The user reports that the Reports page still requires horizontal swiping on 400px devices. This suggests that the main layout or specific child components are exceeding the viewport width.

## Root Cause Hypotheses:
1. **Main Content Container**: The `main-content` area might not be constrained with `max-width: 100%` or `min-width: 0`, allowing it to expand beyond the viewport if children are wide.
2. **Double Padding**: Combined padding from `App.jsx` and `Reports/index.jsx` significantly reduces available space (down to ~344px), making standard grid min-widths (like 350px) cause overflow.
3. **Unconstrained Tabs**: The navigation tabs flex container might be pushing the parent container width if not explicitly constrained.
4. **Grid Min-Widths**: Standard `minmax(350px, 1fr)` might be causing overflow on 400px devices even if media queries are intended to handle it, due to inheritance or specificity issues.

## Proposed Changes:

### 1. Global CSS Adjustments (`src/index.css`)
- Add `max-width: 100vw` and `overflow-x: hidden` to the root flex container.
- Ensure `.main-content` has `min-width: 0` and `overflow-x: hidden`.
- Reduce padding on mobile devices further to maximize available content area.

### 2. Main Layout Enhancement (`src/App.jsx`)
- Ensure consistent `box-sizing: border-box`.
- Explicitly set `max-width: 100%` on the `main` tag.

### 3. Reports Module Fixes (`src/components/Reports/index.jsx`)
- Ensure the navigation tabs container has `width: 100%` and `overflow-x: auto`.
- Further reduce the inner padding of the reports container on screens smaller than 500px.

### 4. Sub-Component Refinements
- **Sales/Expenses/Profitability/Orders/Inventory**: 
  - Update grid columns to use `minmax(min(280px, 100%), 1fr)` instead of fixed larger pixel values.
  - Ensure all charts have `min-width: 0` parents to prevent them from stretching.
  - Check for any `white-space: nowrap` that could cause overflow in headers or labels.

## Verification:
- Resize browser to 400px and verify that no horizontal scrollbar appears on the main page.
- Ensure the content area fills the viewport correctly.
- Verify that tabs still scroll independently if they exceed the width.
