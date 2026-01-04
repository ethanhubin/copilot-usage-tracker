# Copilot Usage Realtime（Copilot 使用量实时显示）

这是一个 VS Code 插件，用于实时显示你的 GitHub Copilot Premium Requests（高级请求）使用量。

> 英文说明见：README.md

## 功能

- **状态栏实时显示**：在 VS Code 状态栏展示用量
- **三种展示模式**：点击状态栏切换 Normal / Progress Bar / Minimal
  - Normal：`🚀 76/1500 (30.7%)`
  - Progress：`🚀 █████░░░░░ 30.7%`
  - Minimal：`🚀 30.7%`
- **阈值告警**：超过阈值时使用 VS Code 的 warning/error 主题色提示
- **详情面板**：展示剩余额度、重置日期、数据来源
- **自动刷新**：可配置自动刷新间隔
- **自动鉴权（推荐）**：通过 VS Code 的 GitHub 登录获取数据（不需要 PAT）
- **安全存储 Token**：如使用 PAT，会通过 VS Code SecretStorage 安全保存

## 安装

### 从 VS Code Marketplace

1. 打开 VS Code
2. 打开扩展面板（`Ctrl+Shift+X`）
3. 搜索 “Copilot Usage Realtime”
4. 点击安装

### 手动安装（VSIX）

1. 从 Releases 下载 `.vsix`：https://github.com/ethanhubin/copilot-usage-tracker/releases
2. 打开命令面板（`Ctrl+Shift+P`）
3. 运行：`Extensions: Install from VSIX...`
4. 选择下载的 `.vsix`

## 配置/登录

### 自动（推荐）

1. 运行命令：`Copilot Usage: Authenticate with GitHub`
2. 按提示完成授权
3. 状态栏将自动显示用量

说明：
- 依赖 VS Code 的 GitHub authentication provider（你可能需要先在 VS Code 里登录 GitHub）。
- 自动模式会调用 GitHub 的 Copilot internal API。

### 手动（PAT）

当自动模式不可用时，可使用 GitHub Personal Access Token（PAT）作为回退方案：

1. 打开：https://github.com/settings/tokens
2. 创建 token，权限需要包含 `Plan: read-only`
3. 运行命令：`Copilot Usage: Set GitHub Token`
4. 粘贴 token

说明：
- PAT 只用于回退（通过 GitHub Billing API 获取用量）。
- Token 会保存到 VS Code SecretStorage。

## 使用方式

- 点击状态栏图标切换显示模式
- 悬停状态栏查看 tooltip
- `Copilot Usage: Show Details` 打开详情面板
- `Copilot Usage: Show Logs` 打开日志输出（排查问题用）

## 命令

| 命令 | 说明 |
|------|------|
| `Copilot Usage: Refresh` | 手动刷新用量 |
| `Copilot Usage: Authenticate with GitHub` | 使用 VS Code GitHub 登录自动获取用量 |
| `Copilot Usage: Set GitHub Token` | 设置 PAT（回退方案） |
| `Copilot Usage: Clear Token` | 清除已保存的 PAT |
| `Copilot Usage: Show Details` | 打开详情面板 |
| `Copilot Usage: Show Logs` | 打开日志输出 |

## 配置项

| 配置 | 默认值 | 说明 |
|------|--------|------|
| `copilotUsageTracker.plan` | `pro` | 预留配置（当前版本不生效） |
| `copilotUsageTracker.refreshInterval` | 300 | 自动刷新间隔（秒） |
| `copilotUsageTracker.showPercentage` | `true` | 预留配置（当前版本不生效） |
| `copilotUsageTracker.warningThreshold` | 80 | 达到该百分比后切换为 warning 主题色 |

## 常见问题

- 状态栏显示 `Copilot: No Token`：运行 `Copilot Usage: Authenticate with GitHub`。
- 授权成功但没有数据/报错：运行 `Copilot Usage: Show Logs`，查看 `Copilot Usage Realtime` 输出面板。
- 企业网络/代理环境：可能会阻止访问 GitHub API。

## 隐私与数据

- 自动模式使用 VS Code GitHub 认证并调用：`https://api.github.com/copilot_internal/user`
- PAT 回退会调用 GitHub REST API，例如：`https://api.github.com/user` 及 billing usage 相关接口
- 如果你设置了 PAT，会存储在 VS Code SecretStorage 中
