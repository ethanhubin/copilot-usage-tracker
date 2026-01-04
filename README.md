# Copilot Usage Realtime

A VS Code extension to track and display your GitHub Copilot premium request usage in real-time.

## Features

-  **Real-time Usage Display**: See your Copilot premium request usage directly in the VS Code status bar
-  **3 Display Modes**: Click to toggle between Normal, Progress Bar, and Minimal modes
  - **Normal**: `76/1500 (30.7%)`
  - **Progress**: ` 30.7%`
  - **Minimal**: `30.7%`
-  **Warning Thresholds**: Color-coded status bar (green  yellow  red) based on usage percentage
-  **Detailed Panel**: View detailed usage breakdown
-  **Auto-refresh**: Configurable automatic refresh interval
-  **Auto-detection**: Automatically detects usage via GitHub authentication (no PAT required!)
-  **Secure Token Storage**: Optional PAT stored securely using VS Code SecretStorage API

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Copilot Usage Realtime"
4. Click Install

### Manual Installation
1. Download the `.vsix` file from [Releases](https://github.com/ethanhubin/copilot-usage-tracker/releases)
2. In VS Code, go to Extensions    Install from VSIX

## Setup

### Automatic (Recommended)
1. Run command: `Copilot Usage: Authenticate with GitHub`
2. Authorize when prompted
3. Done! Usage will be displayed automatically

### Manual (PAT)
If auto-detection doesn't work, you can use a Personal Access Token:

1. Go to [GitHub Settings  Developer settings  Personal access tokens](https://github.com/settings/tokens)
2. Create a new token with `Plan: read-only` permission
3. Run command: `Copilot Usage: Set GitHub Token`
4. Paste your token

## Usage

- **Click status bar icon** to toggle display modes
- **Hover** to see detailed usage info
- Run `Copilot Usage: Show Details` for full panel
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
| `copilotUsageTracker.refreshInterval` | 300 | Auto-refresh interval in seconds |
| `copilotUsageTracker.warningThreshold` | 80 | Warning color threshold (%) |

## License

MIT
