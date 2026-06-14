# 推送与提交指南

> 代码已就绪,执行以下步骤完成提交。

---

## 第一步: 推送到 GitHub

本地有 6 个 commit 未推送(四轮优化 + 文档更新):

```bash
cd "C:/Users/lenovo/Desktop/shixi"

# 确认待推送的 commit
git log origin/main..HEAD --oneline

# 推送到远程 main 分支
git push origin main
```

**预期输出:**
```
Enumerating objects: XX, done.
...
To https://github.com/wyb123465/ai-voice-drawing-tool.git
   d6234b1..da41c65  main -> main
```

---

## 第二步: 确认 GitHub Actions 部署成功

1. 访问: https://github.com/wyb123465/ai-voice-drawing-tool/actions
2. 等待最新 workflow run 完成(绿色✓)
3. 如果失败,点击查看日志,常见问题:
   - `package-lock.json` 不匹配 → 本地 `npm install` 后重新 commit 推送
   - Pages 未启用 → 仓库 Settings → Pages → Source 选 "GitHub Actions"

---

## 第三步: 确认 Pages 部署生效

访问部署地址,确认是最新版本(66 测试、焦点高亮、澄清追问):

```
https://wyb123465.github.io/ai-voice-drawing-tool/
```

**验证方式:**
1. 打开页面,按 F12 打开控制台
2. 输入: `window.voiceDrawingDemo.run("画一个圆")` 然后 `window.voiceDrawingDemo.run("在它右边画一个正方形")` 然后 `window.voiceDrawingDemo.run("把它改成红色")`
3. 如果**圆变红**(不是方块),说明最新代码已部署 ✅
4. 检查右侧运行看板:"测试 66 / 66"

如果还是旧版(方块变红 / 测试数不是 66),等 5–10 分钟后刷新(Pages 有缓存延迟)。

---

## 第四步: 录制 Demo 视频

按照 [`docs/submission.md`](./docs/submission.md) 第 64–120 行的**加强版脚本**录制,重点展示:

1. ✅ **复杂拆解**(30秒): "画太阳,下面有山,山前面有树"
2. ✅ **焦点指代**(45秒): "画圆 → 它右边画方块 → 把它改红"(圆变红,有焦点描边)
3. ✅ **ASR 容错**(30秒): "画个园/兰色"
4. ✅ **澄清追问**(45秒): "三角形上去" → 反问 → "对" → 执行
5. ✅ **序号选择**(30秒): "删除第二个圆"
6. ✅ **撤销导出**(15秒)
7. (可选) **LLM 兜底**(30秒): `?llmdemo=1` + "画一只猫"

**时长:** 3–5 分钟,不超过 8 分钟

**录制工具建议:**
- Windows: Xbox Game Bar (Win+G) / OBS Studio
- Mac: QuickTime / ScreenFlow
- 浏览器: Chrome/Edge(Web Speech API 支持最好)

**录制环境:**
- 打开: https://wyb123465.github.io/ai-voice-drawing-tool/ (用部署版,不用 localhost)
- 麦克风授权成功
- 右侧日志面板保持可见(展示"规则 / 澄清确认 / 云端·模拟"标签)

---

## 第五步: 上传视频并回填链接

### 上传平台选择

| 平台 | 优点 | 缺点 | 推荐度 |
|---|---|---|---|
| **B 站** | 评委友好,无需登录观看 | 需要审核(1–24小时) | ⭐⭐⭐⭐⭐ |
| **阿里云盘** | 秒传,直接分享 | 需要登录或下载 App | ⭐⭐⭐⭐ |
| **腾讯微云** | 秒传,支持在线预览 | 非会员限速 | ⭐⭐⭐ |
| **GitHub Release** | 和代码在一起 | 国内访问慢,视频体积受限 | ⭐⭐ |

**推荐: B 站(投稿→自制)或阿里云盘(分享链接设为"公开")**

### 回填链接

1. 上传后复制分享链接
2. 匿名窗口测试链接可打开(无需登录)
3. 编辑 `README.md` 第 13 行:
   ```markdown
   **Demo 视频**: [B站](https://www.bilibili.com/video/BVxxxxxx) / [阿里云盘](https://www.alipan.com/s/xxxxx)
   ```
4. Commit + Push:
   ```bash
   git add README.md
   git commit -m "Add demo video link"
   git push origin main
   ```

---

## 第六步: 最终检查

用 [`docs/PRE_SUBMISSION_CHECKLIST.md`](./docs/PRE_SUBMISSION_CHECKLIST.md) 逐项确认:

- [x] 代码推送到 GitHub
- [x] Actions 部署成功
- [x] Pages 地址可访问且是最新版(66 测试、焦点高亮可见)
- [ ] Demo 视频已录制
- [ ] 视频已上传,链接可访问(匿名窗口测试)
- [ ] 视频链接已回填到 README
- [x] 设计文档完整: [`docs/design.md`](./docs/design.md)
- [x] 测试全过: `npm test` → 66/66

---

## 第七步: 提交到赛题平台

按赛题平台要求提交:

1. **仓库链接**: https://github.com/wyb123465/ai-voice-drawing-tool
2. **部署地址**: https://wyb123465.github.io/ai-voice-drawing-tool/
3. **设计文档**: https://github.com/wyb123465/ai-voice-drawing-tool/blob/main/docs/design.md
4. **Demo 视频**: (B 站 / 云盘链接,回填后填写)
5. **补充说明**(可选):
   - 66 个自动化测试
   - 支持无麦克风文本回放: `?replay=1`
   - 支持无密钥 LLM 兜底演示: `?llmdemo=1`
   - 一键评审演示脚本(右侧面板)

---

## 提交后

- 确认提交成功(平台显示"已提交"状态)
- 保留仓库公开状态,直到赛题结束
- 如果评委提问或要求补充材料,及时响应

---

**当前状态: 代码已就绪,只差视频录制 + 推送。预计 1–2 小时完成。**

**加油,冲一等奖! 🎯**
