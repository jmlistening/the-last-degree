# 已知事项

- Windows 原生安装包待构建。Tauri CLI 运行 cargo metadata 时找不到 Cargo，且未检测到带 Windows SDK 的 MSVC。当前可双击静态启动器在 Windows 浏览器游玩。
- Android 调试 APK 待构建。Capacitor 同步成功。Gradle 8.11.1 分发包下载超时，本机未检测到 SDK Platform 35 工具链。仓库包含可在有工具链的环境运行的打包配置。
- 手机适配已在 Edge 触屏模拟和离线重载中测试。真实 Android、iPhone 主屏幕安装、帧率目标和长期兼容性仍需实机验证。
- 本地进度按浏览器来源和应用分别保存。清除站点数据会重置战役。
- 本地 Tauri 与 Android 工程内置 TypeScript 模拟。Python 参考服务独立运行。
- GitHub 工作流尚未远程运行。
- 热浪视觉使用半透明波纹、暖色光照和地表裂纹。视觉效果和实机性能仍需结合设备做进一步调校。
