# Copilot Usage Realtime

A VS Code extension to track and display your GitHub Copilot premium request usage in real-time.

For Simplified Chinese docs, see: README.zh-CN.md

## Features

-  **Real-time Usage Display**: See your Copilot premium request usage directly in the VS Code status bar
-  **3 Display Modes**: Click to toggle between Normal, Progress Bar, and Minimal modes
  - **Normal**: `🚀 76/1500 (30.7%)`
  - **Progress**: `🚀 █████░░░░░ 30.7%`
  - **Minimal**: `🚀 30.7%`
-  **Warning Thresholds**: Uses VS Code theme warning/error colors based on usage percentage
-  **Details Panel**: View remaining quota, reset date, and data source
-  **Auto-refresh**: Configurable automatic refresh interval
-  **Auto-detection**: Automatically detects usage via VS Code GitHub authentication (no PAT required!)
-  **Secure Token Storage**: Optional PAT stored securely using VS Code SecretStorage API

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Copilot Usage Realtime"
4. Click Install

### Manual Installation
1. Download the `.vsix` file from [Releases](https://github.com/ethanhubin/copilot-usage-tracker/releases)
2. In VS Code, open Command Palette (`Ctrl+Shift+P`)
3. Run: `Extensions: Install from VSIX...`
4. Select the downloaded `.vsix`

## Setup

### Automatic (Recommended)
1. Run command: `Copilot Usage: Authenticate with GitHub`
2. Authorize when prompted
3. Done! Usage will be displayed automatically

Notes:
- This uses the VS Code GitHub authentication provider (you may need to sign into GitHub in VS Code).
- Usage is fetched from GitHub's Copilot internal API.

### Manual (PAT)
If auto-detection doesn't work, you can use a Personal Access Token:

1. Go to [GitHub Settings  Developer settings  Personal access tokens](https://github.com/settings/tokens)
2. Create a new token with `Plan: read-only` permission
3. Run command: `Copilot Usage: Set GitHub Token`
4. Paste your token

Notes:
- PAT is only used as a fallback method (GitHub Billing API).
- Token is stored via VS Code SecretStorage.

## Usage

- **Click status bar icon** to toggle display modes
- **Hover** to see detailed usage info
- Run `Copilot Usage: Show Details` for the details panel
- Run `Copilot Usage: Show Logs` for debugging

## Commands

| Command | Description |
|---------|-------------|
| `Copilot Usage: Refresh` | Manually refresh usage data |
| `Copilot Usage: Authenticate with GitHub` | Auto-detect usage via GitHub auth |
| `Copilot Usage: Set GitHub Token` | Set PAT manually |
| `Copilot Usage: Clear Token` | Remove stored PAT |
| `Copilot Usage: Show Details` | Open detailed usage panel |
| `Copilot Usage: Show Logs` | Open debug output |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `copilotUsageTracker.plan` | `pro` | Reserved for future use (currently has no effect) |
| `copilotUsageTracker.refreshInterval` | 300 | Auto-refresh interval in seconds |
| `copilotUsageTracker.showPercentage` | `true` | Reserved for future use (currently has no effect) |
| `copilotUsageTracker.warningThreshold` | 80 | Switch to warning theme color at this percentage |

## Troubleshooting

- If you see `Copilot: No Token`, run `Copilot Usage: Authenticate with GitHub`.
- If authentication succeeds but usage is empty or errors, run `Copilot Usage: Show Logs` and check the `Copilot Usage Realtime` output channel.
- If you're in a restricted environment (enterprise network / proxy), GitHub API calls may be blocked.

## Privacy & Data

- Automatic mode uses VS Code GitHub authentication and calls `https://api.github.com/copilot_internal/user`.
- PAT fallback calls GitHub REST APIs such as `https://api.github.com/user` and billing usage endpoints.
- If you set a PAT, it is stored in VS Code SecretStorage.

## Development

- Build: `npm run compile`
- Watch: `npm run watch`
- Debug: use the `Run Extension` launch configuration
- Package: `npm run package`

## License

MIT
