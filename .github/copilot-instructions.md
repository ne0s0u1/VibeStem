# VibeStem Copilot 开发指南

基于 **Vercel Best Practices** 官方规则库，统一指导代码生成、审查、重构。

---

## 📋 项目信息

**技术栈:**

- React 19 + TypeScript + Vite 7
- TailwindCSS v4
- Web Audio API (wavesurfer.js 7.12)
- Appwrite (BaaS：认证、数据库、存储)
- FastAPI 后端 (Demucs 分轨推理)

---

## 📚 模块化规则库

项目规则按模块分类存储在 `.github/skills/` 目录，按需加载以优化 Copilot 性能。

### 🔄 React 性能与架构规则

**文件:** [`.github/skills/react-best-practices.md`](.github/skills/react-best-practices.md)

57 条 Vercel 官方规则，分 8 个优先级：

- **1️⃣ CRITICAL: 消除异步瀑布流** (`async-*`) — Promise 并行化、早启晚等
- **2️⃣ CRITICAL: Bundle 优化** (`bundle-*`) — 直接导入、动态加载、条件 import
- **3️⃣ HIGH: 服务端性能** (`server-*`) — React.cache()、数据去重、序列化最小化
- **4️⃣ MEDIUM-HIGH: 客户端数据获取** (`client-*`) — SWR 去重、被动事件监听
- **5️⃣ MEDIUM: Re-render 优化** (`rerender-*`) — memo、useEffect 依赖、transitions
- **6️⃣ MEDIUM: 渲染性能** (`rendering-*`) — JSX 提升、content-visibility、SVG 动画
- **7️⃣ LOW-MEDIUM: JS 性能** (`js-*`) — DOM 批处理、Set/Map、正则提升
- **8️⃣ LOW: 高级模式** (`advanced-*`) — Callback Refs、init-once 模式

**VibeStem 特例:**

- 音频资源释放、大波形处理、Suno/Demucs 异步任务并行化、轮询配置

### 🎨 Web 设计与可访问性规则

**文件:** [`.github/skills/web-design-guidelines.md`](.github/skills/web-design-guidelines.md)

100+ Vercel 官方规则，覆盖 12 个核心模块：

- **可访问性** (A11y) — aria-label、语义 HTML、键盘导航
- **焦点状态** — focus-visible、outline 替代品
- **表单设计** — label、验证、自动完成、粘贴支持
- **动画** — 尊重 prefers-reduced-motion、GPU 友好的属性、可中断
- **排版** — 智能引号、省略号、非断行空格、text-wrap: balance
- **内容处理** — 长文本截断、空白状态、弹性布局
- **图片优化** — width/height 防 CLS、lazy loading、preload
- **性能** — 虚拟化大列表、DOM 批操作、CDN preconnect
- **导航与状态** — URL 反映状态、深链接、确认模态
- **触摸交互** — touch-action、overscroll-behavior、inert
- **国际化** — Intl.DateTimeFormat/NumberFormat
- **深色模式** — color-scheme、theme-color

**VibeStem 特例:**

- 音频播放器 A11y、BPM/EQ 实时预览、进度指示器

### ✅ 快速检查清单

写完代码前，按优先级检查：

- [ ] Promise 有并行吗？(async-parallel)
- [ ] 有重复导入吗？(bundle-barrel-imports)
- [ ] useEffect 依赖完整吗？(rerender-dependencies)
- [ ] 有不必要的 re-render 吗？(rerender-memo, rerender-lazy-state-init)
- [ ] 音频资源释放了吗？(wavesurfer.destroy())
- [ ] 大列表用 content-visibility 了吗？(rendering-content-visibility)
- [ ] 表单有 label 吗？(accessibility)
- [ ] 图标按钮有 aria-label 吗？(accessibility)

---

## 🎯 使用指南

1. **按场景查阅**: 编码时遇到性能/设计问题 → 打开对应规则文件
2. **Code Review**: 提交 PR 前扫一遍快速检查清单
3. **深入学习**: 每条规则包含 ❌ 反例、✅ 正例、💡 原理说明

---

**更新时间:** 2026-02-26  
**基于:** Vercel Best Practices v1.0.0
