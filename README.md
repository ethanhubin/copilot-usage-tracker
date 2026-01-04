# Copilot Usage Tracker

A VS Code extension to track and display your GitHub Copilot premium request usage in real-time.

![Status Bar Preview](resources/preview.png)

## Features

- 🚀 **Real-time Usage Display**: See your Copilot premium request usage directly in the VS Code status bar
- 📊 **Percentage View**: Display usage as "60/300 (20%)" for quick reference
- ⚠️ **Warning Thresholds**: Color-coded status bar (green → yellow → red) based on usage percentage
- 📈 **Detailed Panel**: Click to view detailed usage breakdown by AI model
- 🔄 **Auto-refresh**: Configurable automatic refresh interval
- 🔐 **Secure Token Storage**: GitHub PAT stored securely using VS Code's SecretStorage API

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Copilot Usage Tracker"
4. Click Install

### Manual Installation
1. Download the `.vsix` file from [Releases](https://github.com/ethanhubin/copilot-usage-tracker/releases)
2. In VS Code, go to Extensions → ⋯ → Install from VSIX

## Setup

### 1. Create a GitHub Personal Access Token (PAT)

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click "Generate new token"
3. Give it a name like "Copilot Usage Tracker"
4. Set expiration as needed
5. Under "Account permissions", find **"Plan"** and set it to **"Read-only"**
6. Click "Generate token"
7. Copy the token (starts with `github_pat_`)

### 2. Configure the Extension

1. In VS Code, press `Ctrl+Shift+P` and run "Copilot Usage: Set GitHub Token"
2. Paste your token and press Enter
3. The status bar will update to show your usage

### 3. Set Your Plan (Important!)

The API doesn't return your plan's allowance, so you need to set it manually:

1. Go to Settings → Extensions → Copilot Usage Tracker
2. Set "Plan" to match your subscription:
   - **Free**: 50 requests/month
   - **Pro**: 300 requests/month
   - **Pro+**: 1500 requests/month
   - **Business**: 300 requests/user/month
   - **Enterprise**: 1000 requests/user/month

## Usage

### Status Bar
The extension adds a status bar item showing:
- `🚀 60/300 (20%)` - Normal usage (green)
- `🚀 250/300 (83%)` - High usage (yellow, configurable threshold)
- `🚀 320/300 (107%)` - Over limit (red)

### Commands
| Command | Description |
|---------|-------------|
| `Copilot Usage: Refresh` | Manually refresh usage data |
| `Copilot Usage: Set GitHub Token` | Configure your GitHub PAT |
| `Copilot Usage: Show Details` | Open detailed usage panel |
| `Copilot Usage: Clear Token` | Remove stored token |

### Settings
| Setting | Default | Description |
|---------|---------|-------------|
| `copilotUsageTracker.plan` | `pro` | Your Copilot subscription plan |
| `copilotUsageTracker.refreshInterval` | `300` | Auto-refresh interval in seconds |
| `copilotUsageTracker.showPercentage` | `true` | Show percentage in status bar |
| `copilotUsageTracker.warningThreshold` | `80` | Warning color threshold (%) |

## FAQ

### Why do I need to set my plan manually?
GitHub's API returns the number of requests used but doesn't include your plan's total allowance. We use the plan setting to calculate the percentage.

### The API returns 404
Your GitHub account may not have Enhanced Billing enabled. This is required to access usage data via the API.

### Token permission error (403)
Make sure your PAT has the "Plan: Read-only" permission under Account permissions.

## Privacy & Security

- Your GitHub token is stored securely using VS Code's built-in SecretStorage API
- The token is never logged or transmitted anywhere except to GitHub's official API
- All communication is over HTTPS

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- GitHub for providing the Copilot Usage API
- VS Code team for the excellent extension API
