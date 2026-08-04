# 更新日志 / Changelog

记录 Mote 每个版本的变更。版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.2] - 2026-08-04

### 修复
- **Windows 便携包构建失败**：修复 `spawnSync npm.cmd EINVAL`。Windows 上用 `spawnSync` 运行 `.cmd`/`.bat` 必须设置 `shell: true`，否则现代 Node.js 直接报错，导致打包流程在第一步 `npm run build` 就中断。
- **Windows 便携包打包损坏**：`Compress-Archive` 压缩刚拷贝的文件时，会因 Windows Defender 实时扫描占用文件而中途失败，且该错误为非终止错误，powershell 仍退出 0，导致脚本误报成功并产出残缺 / 空的 zip。改用 `tar`（bsdtar）创建 zip，共享读模式更稳，失败时也会正确返回非零退出码。
- **粘贴 / 选择参考图失败**：补全缺失的 `/api/uploads` 路由。此前因提交遗漏，前端 POST 到不存在的接口，浏览器把非 JSON 的错误响应当 JSON 解析，报 `Unexpected token 'S', "Server act"...`。
- **必填项为空时报错不友好**：供应商名称 / 模型显示名称 / Model ID 为空时，原先抛 Zod 默认的英文 `Too small: expected string to have >=1 characters`（且看不出是哪个字段），现改为直接提示具体哪一项未填写；多项同时缺失会一并列出。

### 新增
- **应用内显示版本号**：设置页标题处展示当前版本（构建期内联，无需运行时读 `package.json`）。
- **带版本的便携包名**：便携包文件名与解压目录包含版本号，如 `Mote-1.0.2-win-x64.zip`，便于区分多次构建。
- 新增本更新日志 `CHANGELOG.md`。

## [0.1.0] - 2026-08-03

### 新增
- 首个便携独立分发包（macOS arm64/x64、Windows x64），自带 Node 运行时，解压即用，无需安装 Node 或依赖。
- 本地 AI 聊天与图像 / 视频生成界面，数据全部保存在本机（`data/` 与 `out/` 目录）。
- 多模态对话模型图片输入支持。
- 多供应商本地配置：火山方舟、OpenAI 兼容、即梦视觉（AK/SK）、可灵 API 2.0。
