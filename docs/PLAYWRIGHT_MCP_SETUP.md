# Playwright MCP Setup Guide

This guide explains how Playwright MCP (Model Context Protocol) has been configured for the AIVlingual project.

## Overview

Playwright MCP is a Model Context Protocol server that provides browser automation capabilities using Playwright. It enables AI assistants to interact with web pages, take screenshots, generate test code, and execute JavaScript in a real browser environment.

## Configuration

### 1. MCP Configuration File

The Playwright MCP server is configured in `.claude/mcp.json`:

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### 2. Permissions

Playwright-specific permissions have been added to `.claude/settings.local.json`:
- `Bash(npx:*)` - Allows running npx commands
- `Bash(playwright:*)` - Allows running playwright commands
- `Bash(npx playwright:*)` - Allows running playwright via npx

### 3. Installed Components

- **Playwright**: Already included in package.json (`"playwright": "^1.53.1"`)
- **Browsers**: Chromium, Firefox, and WebKit browsers installed via `npx playwright install`
- **MCP Server**: Uses Microsoft's official `@playwright/mcp` package

## Usage

### With AI Assistants

When using Claude or other AI assistants with MCP support, you can now request browser automation tasks such as:

- **Web Scraping**: "Navigate to [URL] and extract the main content"
- **Testing**: "Create an E2E test for the login flow"
- **Screenshots**: "Take a screenshot of the homepage"
- **Interaction**: "Fill out the contact form and submit it"
- **Validation**: "Check if the button is clickable"

### Manual Testing

To verify Playwright MCP is working correctly, run:

```bash
node tests/test-playwright-mcp.js
```

This test script:
1. Launches a browser
2. Navigates to example.com
3. Takes a screenshot
4. Retrieves the accessibility tree (what MCP uses)
5. Closes the browser

## How Playwright MCP Works

### Snapshot Mode (Default)

Instead of using visual recognition, Playwright MCP uses the browser's accessibility tree - a structured representation of the page content similar to what screen readers use. This approach is:

- **Fast and lightweight**: No vision models needed
- **Deterministic**: Avoids ambiguity common with screenshot-based approaches
- **LLM-friendly**: Operates purely on structured data

### Available Tools

When Playwright MCP is active, the following tools become available:

1. **navigate**: Navigate to a URL
2. **screenshot**: Take a screenshot of the current page
3. **click**: Click on an element
4. **fill**: Fill out input fields
5. **select**: Select options from dropdowns
6. **hover**: Hover over elements
7. **evaluate**: Execute JavaScript in the page context
8. **getAccessibilityTree**: Get the structured representation of the page

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure `.claude/settings.local.json` includes the necessary Bash permissions
2. **Browser Not Found**: Run `npx playwright install` to install browsers
3. **MCP Not Recognized**: Restart your AI assistant after configuration changes

### Verification Steps

1. Check MCP configuration exists: `cat .claude/mcp.json`
2. Verify permissions: `cat .claude/settings.local.json | grep playwright`
3. Test Playwright directly: `npx playwright --version`
4. Run test script: `node tests/test-playwright-mcp.js`

## Advanced Configuration

### Using Different Browsers

Modify the MCP configuration to specify a browser:

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser=firefox"]
    }
  }
}
```

### Vision Mode

To enable vision mode (uses screenshots instead of accessibility tree):

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--vision"]
    }
  }
}
```

### Isolated Mode

For isolated browser sessions:

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--isolated"]
    }
  }
}
```

## Next Steps

With Playwright MCP configured, you can now:

1. Create automated tests for AIVlingual
2. Scrape data from websites for translation examples
3. Test the web interface automatically
4. Generate screenshots for documentation

Remember to restart your AI assistant client after making any configuration changes to `.claude/mcp.json`.