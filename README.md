# Mote

一个只在本机运行的轻量模型界面，支持连续对话、Seedream 图片生成和
Seedance 视频生成。配置与历史使用 JSON 保存，上传和生成结果保存到项目目录。

## 启动

```bash
npm install
npm run dev
```

浏览器打开 <http://localhost:3000>，进入“设置”添加供应商：

- Base URL：例如 `https://ark.cn-beijing.volces.com/api/v3`
- API Key：火山方舟 API Key
- 模型 ID：上游服务使用的真实 ID
- 类型：对话、图像或视频

一个供应商可以配置多个模型，共用 Base URL 和 API Key。

## 本地文件

```text
data/config.json            # 供应商和模型配置
data/conversations/*.json   # 每个历史会话一个文件
out/uploads/                # 上传的参考图
out/images/                 # 生成的图片
out/videos/                 # 生成的视频
```

`data/` 和 `out/` 已加入 `.gitignore`。API Key 不存入浏览器
`localStorage`，只由本机 Next.js 进程读取。

## 接口兼容性

- 对话：OpenAI-compatible `POST /chat/completions`
- 图片：火山方舟 `POST /images/generations`
- 视频：火山方舟 `POST /contents/generations/tasks`，随后查询任务状态

图片和视频返回后会立即下载到 `out/`，避免上游临时 URL 过期。

## 检查

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
