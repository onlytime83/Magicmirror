# 魔镜魔镜 · 第一版 MVP

这是一个基于 Node.js 服务端的手机 PWA 原型：

- 前置摄像头实时镜像
- 花朵镜框、粒子和光效
- 浏览器语音识别（支持的浏览器中）
- 可连接 OpenAI 兼容模型的文字对话
- 浏览器中文语音朗读
- 示例问题
- 5 种魔镜人格
- 美颜/柔光开关
- PWA，可添加到 iPhone 主屏幕

## 启动与手机访问

需要 Node.js 18 或更高版本。模型密钥只保存在服务端，不要写进 `app.js`：

```bash
export AI_API_KEY="你的模型服务密钥"
export AI_MODEL="gpt-4o-mini"
node server.mjs
```

可选：兼容 OpenAI Chat Completions API 的其他服务可通过 `AI_BASE_URL` 配置 API 根地址（默认 `https://api.openai.com/v1`）。在电脑上访问 `http://localhost:8080`。

手机需要通过**同一 HTTPS 部署地址**访问此服务，才能使用前置摄像头和文字对话。将项目部署到支持 Node.js 的托管平台，并配置 `AI_API_KEY`、可选的 `AI_MODEL` 和 `AI_BASE_URL` 环境变量；仅托管静态文件的 GitHub Pages 无法运行此模型代理。局域网 HTTP 地址可以预览页面，但 iPhone 浏览器通常会禁止摄像头。

## 下一版建议

1. 为模型对话增加逐字流式回复。
2. 增加 AI 情绪识别，但不做外貌评分。
3. 增加更多魔镜声音。
4. 增加“每日魔镜祝福”。
5. 增加真正的实时美颜/人像分割。
6. 增加使用历史和“今日鼓励”。
