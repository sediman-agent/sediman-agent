# Comprehensive UI Testing with Playwright

## Overview
This document provides complete instructions for running the comprehensive Playwright UI tests that cover all React components and user interactions.

## Prerequisites

### Install Playwright
```bash
cd /Users/jason/Desktop/OpenSkynet/packages/app
npm install -D @playwright/test playwright
```

### Install Playwright Browsers
```bash
npx playwright install
```

## Test Files Created

### 1. **SandboxPanel.spec.ts** - Complete Browser Panel UI Tests
- Panel open/close functionality
- URL navigation and input handling
- Tab management (add, close, switch)
- Panel resize and fullscreen
- Browser controls (back, forward, refresh)
- External URL screenshot display
- Safe URL webview display
- Keyboard navigation
- Error states handling
- State persistence
- Accessibility testing

### 2. **AppUI.spec.ts** - Main Application UI Tests  
- Main application loading
- Navigation sidebar
- Page navigation
- Agent interface
- Settings interface
- Sessions interface
- Models interface
- Skills interface
- Responsive design (mobile, tablet, desktop)
- User interactions (buttons, forms, dropdowns)
- Keyboard shortcuts
- Search functionality
- Error handling (404, API errors, network errors)
- Performance testing
- Accessibility testing

### 3. **BrowserUI.spec.ts** - Browser Components Tests
- Browser panel open/close
- Browser controls display
- URL input and navigation
- Tab operations (add, close, switch)
- Status indicators
- Fullscreen mode
- Refresh action
- Back/forward navigation
- Screenshot display for external URLs
- Panel resize
- Keyboard shortcuts
- Error handling (invalid URLs, network errors, timeouts)

## Running Tests

### Run All UI Tests
```bash
cd /Users/jason/Desktop/OpenSkynet/packages/app
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test SandboxPanel.spec.ts
npx playwright test AppUI.spec.ts
npx playwright test BrowserUI.spec.ts
```

### Run Tests in Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Tests in Headed Mode (see browser)
```bash
npx playwright test --headed
```

### Run Tests with UI Mode
```bash
npx playwright test --ui
```

### Run Tests with Debugging
```bash
npx playwright test --debug
```

### Generate Test Report
```bash
npx playwright show-report
```

## Test Coverage

### Component Coverage
- ✅ **SandboxPanel** - Complete browser panel functionality
- ✅ **Main Application** - Core app interface and navigation  
- ✅ **Browser Components** - All browser-related UI elements
- ✅ **Navigation** - All navigation and routing
- ✅ **Forms & Inputs** - All user input handling
- ✅ **Responsive Design** - Mobile, tablet, desktop viewports
- ✅ **Accessibility** - ARIA labels, keyboard navigation, screen readers
- ✅ **Error Handling** - Invalid URLs, network errors, API errors
- ✅ **Performance** - Load times, rapid interactions, memory leaks

### Browser Coverage
- ✅ **Chromium** (Chrome, Edge)
- ✅ **Firefox**  
- ✅ **WebKit** (Safari)
- ✅ **Mobile Chrome** (Pixel 5)
- ✅ **Mobile Safari** (iPhone 12)

## Test Scenarios Covered

### User Workflows
1. **Browser Navigation Flow**
   - Open browser panel → Enter URL → Navigate → View content

2. **Tab Management Flow**
   - Add tabs → Switch between tabs → Close tabs → Verify state

3. **Multi-page Browsing**
   - Navigate to page 1 → Navigate to page 2 → Use back/forward

4. **External URL Handling**
   - Navigate to external URL → View screenshot → Verify content

5. **Safe URL Handling**
   - Navigate to safe URL → View webview → Verify content

### Error Scenarios
1. **Invalid URL Navigation**
   - Enter invalid URL → Verify graceful handling → Panel remains functional

2. **Network Error Handling**
   - Simulate network offline → Navigate → Verify error recovery

3. **Timeout Scenarios**
   - Slow down network → Navigate → Verify timeout handling

4. **API Error Handling**
   - Mock API errors → Verify app remains functional

## Integration with Existing Tests

### Browser Automation Tests
The UI tests complement the existing browser automation E2E tests:
- **Browser E2E Tests** (18/18 passing) test backend browser automation
- **Playwright UI Tests** test frontend React components
- **Combined**: Full-stack testing coverage

### Component Tests
The UI tests work alongside the component unit tests:
- **Component Unit Tests** test individual functions and classes
- **Playwright UI Tests** test complete user interactions

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: UI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Troubleshooting

### Common Issues

1. **Playwright not found**
   ```bash
   npm install -D @playwright/test playwright
   ```

2. **Browsers not installed**
   ```bash
   npx playwright install
   ```

3. **Port 1420 already in use**
   ```bash
   # Kill existing process
   lsof -ti:1421 | xargs kill -9
   ```

4. **Tests timing out**
   - Increase timeout in playwright.config.ts
   - Check if dev server is running

## Test Results Location

- **HTML Report**: `playwright-report/index.html`
- **Test Results**: `test-results/`
- **Screenshots**: `test-results/` (on failure)
- **Videos**: `test-results/` (on failure)

## Best Practices

1. **Run tests before committing** changes
2. **Run tests in multiple browsers** for cross-browser verification  
3. **Use UI mode** for debugging test failures
4. **Check test reports** after CI runs
5. **Keep tests updated** when components change

## Next Steps

1. Install Playwright: `npm install -D @playwright/test playwright`
2. Install browsers: `npx playwright install`
3. Run tests: `npx playwright test`
4. Review results: `npx playwright show-report`

## Support

For issues or questions about the UI tests:
- Check Playwright documentation: https://playwright.dev/
- Review test code in `src/components/__tests__/`
- Check configuration in `playwright.config.ts`
