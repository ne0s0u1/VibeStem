# Vercel React Best Practices (57 Rules)

## 📋 项目背景

本项目采用 **Vercel React Best Practices** 官方规范，优化 React 19 + TypeScript + Vite 应用的性能和代码质量。

---

## 🎯 优先级规则 (Critical → Low)

### 1️⃣ **CRITICAL: 消除异步瀑布流** (`async-*`)

**何时适用:** 写 API 调用、数据加载、Promise 链

| 规则                        | 含义                                    | 例子                                                                                     |
| --------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `async-defer-await`         | await 移到真正需要的地方，不要在顶层    | 函数开头别 await，在用到结果时才 await                                                   |
| `async-parallel`            | 独立 Promise 用 `Promise.all()`，别串联 | `await fetch(url1); await fetch(url2)` → `await Promise.all([fetch(url1), fetch(url2)])` |
| `async-dependencies`        | 部分依赖可用 `better-all`（或手动处理） | 3 个请求中 A 不依赖 B/C，但 B 依赖 C                                                     |
| `async-api-routes`          | API 路由：早启 Promise，晚 await        | FastAPI 后端端点开头启 demix Promise，最后一行才等结果                                   |
| `async-suspense-boundaries` | React Server Component 用 Suspense 流式 | 用 `<Suspense>` 包音乐库加载，不阻塞 UI                                                  |

---

### 2️⃣ **CRITICAL: Bundle 优化** (`bundle-*`)

**何时适用:** 导入第三方库、动态加载组件

| 规则                       | 含义                                        | 例子                                                                                           |
| -------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `bundle-barrel-imports`    | **直接导入路径，别用 barrel index**         | ❌ `import { Button } from '@/components'` → ✅ `import { Button } from '@/components/Button'` |
| `bundle-dynamic-imports`   | 重型组件用 `React.lazy()` 或 `next/dynamic` | GeneratePage / ComparePage 延迟加载                                                            |
| `bundle-defer-third-party` | 分析/埋点脚本放在 hydration 后              | 别在 useEffect 最上面加 Sentry/LogRocket                                                       |
| `bundle-conditional`       | 特性开关：条件导入模块                      | 仅在 Suno 开启时才导入 Suno 库                                                                 |
| `bundle-preload`           | hover/focus 时预加载重型资源                | 按钮 onMouseEnter 时预加载生成页面 JS                                                          |

---

### 3️⃣ **HIGH: 服务端性能** (`server-*`)

**何时适用:** 后端数据流、RSC(React Server Components)

| 规则                       | 含义                                 | 例子                                     |
| -------------------------- | ------------------------------------ | ---------------------------------------- |
| `server-cache-react`       | 单次请求内重复数据用 `React.cache()` | Appwrite 查询同一 collection 多次        |
| `server-dedup-props`       | 避免重复序列化 prop                  | RSC 不要传 `{ user, user }`              |
| `server-serialization`     | 最小化发给客户端的数据体积           | 后端 `vocals_url` 缩短，用 CDN shortlink |
| `server-parallel-fetching` | 重构组件结构让数据请求并行化         | 3 个 Tracks，别一个一个加载              |

---

### 4️⃣ **MEDIUM-HIGH: 客户端数据获取** (`client-*`)

**何时适用:** 前端 fetch、API 轮询、浏览器缓存

| 规则                             | 含义                              | 例子                                  |
| -------------------------------- | --------------------------------- | ------------------------------------- |
| `client-swr-dedup`               | 请求去重用 SWR 或 `useSWR()`      | Suno 轮询用 SWR，自动去重 3s 内的请求 |
| `client-passive-event-listeners` | scroll 事件用 `{ passive: true }` | wavesurfer 滚动条用被动监听           |
| `client-localstorage-schema`     | localStorage 版本化，最小化数据   | EQ preset 存本地时压缩 JSON           |

---

### 5️⃣ **MEDIUM: Re-render 优化** (`rerender-*`)

**何时适用:** Context、State、useEffect 滥用、大量组件重绘

| 规则                            | 含义                                      | 例子                                                   |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------ |
| `rerender-defer-reads`          | State 仅在回调用 → 存 Ref，别订阅         | `isPlaying` 仅在 onClick 用 → useRef                   |
| `rerender-memo`                 | 昂贵计算用 `React.memo()` 或 useMemo      | WaveformPlayer 组件 wrap React.memo                    |
| `rerender-dependencies`         | useEffect 依赖用原始类型，别传对象        | ❌ `deps: [config]` → ✅ `deps: [config.bpm]`          |
| `rerender-derived-state`        | 衍生数据渲染时计算，别存 State            | 不要 `setLevel(Math.floor(db))` → 直接 render 时计算   |
| `rerender-lazy-state-init`      | 初始状态昂贵 → 传函数给 useState          | `useState(() => detectBPM(buffer))`                    |
| `rerender-move-effect-to-event` | 交互逻辑别放 useEffect → 放 event handler | 滑块调 EQ → 直接 onChange，不要 useEffect              |
| `rerender-transitions`          | 低优先更新用 `startTransition`            | 波形加载慢 → `startTransition(() => setWavedata(...))` |

---

### 6️⃣ **MEDIUM: 渲染性能** (`rendering-*`)

**何时适用:** DOM、CSS、SVG 更新

| 规则                           | 含义                                | 例子                                          |
| ------------------------------ | ----------------------------------- | --------------------------------------------- |
| `rendering-hoist-jsx`          | 静态 JSX 提到组件外                 | Sidebar Logo 别每次重建                       |
| `rendering-content-visibility` | 长列表用 `content-visibility: auto` | 历史记录列表加这个 CSS                        |
| `rendering-conditional-render` | `bool ? A : B` 不要 `bool && A`     | ✅ `{isLoading ? <Spinner /> : <Data />}`     |
| `rendering-animation-wrapper`  | SVG 动画 → 套 div wrapper 再动画    | 频谱条动画别直接改 SVG 坐标，用 transform div |

---

### 7️⃣ **LOW-MEDIUM: JS 性能** (`js-*`)

**何时适用:** 紧凑循环、大数据处理

| 规则                    | 含义                                   | 例子                                                               |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `js-batch-dom-css`      | 一次改多个 style → 改 class 或 cssText | 10 个波形条配置 → 一条 CSS class，toggle className                 |
| `js-set-map-lookups`    | 频繁查找用 Set/Map O(1)                | BPM 预设 `const presets = new Map([...])`                          |
| `js-length-check-first` | 数组长度检查放最前                     | `if (audio.length > 0) { ... }` 先检查                             |
| `js-combine-iterations` | 多个 filter/map → 一次循环             | ❌ `arr.filter(...).map(...)` → ✅ `arr.reduce((acc, x) => {...})` |
| `js-hoist-regexp`       | 正则表达式提到循环外                   | URL 验证正则提到函数外                                             |

---

### 8️⃣ **LOW: 高级模式** (`advanced-*`)

**何时适用:** 特殊场景、Callback Refs、初始化逻辑

| 规则                          | 含义                             | 例子                                |
| ----------------------------- | -------------------------------- | ----------------------------------- |
| `advanced-use-latest`         | 稳定 Callback Ref                | `useLatestRef(onSeparationDone)`    |
| `advanced-event-handler-refs` | 事件 handler 存 Ref 避免重新绑定 | wavesurfer mousemove handler 存 Ref |
| `advanced-init-once`          | 应用级初始化只执行一次           | Appwrite 连接、Suno 客户端初始化    |

---

## 🎵 VibeStem 专项规则补充

### 音频处理

- **资源释放必须:** wavesurfer 实例卸载时 `.destroy()` / `.unmount()`
- **性能:** 大波形数据(>20min) 需分块绘制或 `content-visibility`
- **CORS:** Demucs 后端返回音频文件时需 CORS，或用 CF Worker 代理

### 异步状态管理

- **轮询:** `POLL_INTERVAL=3000` 已预设，别动
- **Promise 链:** demix_task + Suno_task 独立 → `Promise.all()`
- **超时:** 长任务(>10min) 需超时处理，给用户提示

### 组件切分建议

- **WaveformPlayer**: 刚好是 Memo 候选（props 稳定时）
- **MultiTrackPlayer**: 音量同步需要节流（再结合 Re-render 优化）
- **BPMControl/EQControl**: HTML5 Input 触发高频 setState → 用 Transitions

---

## ✅ Code Review 检查清单

- [ ] Promise 有并行吗？（`async-parallel`）
- [ ] 有重复导入吗？（`bundle-barrel-imports`）
- [ ] useEffect 依赖完整吗？（`rerender-dependencies`）
- [ ] 有不必要的 re-render 吗？（`rerender-memo`, `rerender-lazy-state-init`）
- [ ] wavesurfer 释放了吗？（资源泄漏）
- [ ] 大列表用 `content-visibility` 了吗？（`rendering-content-visibility`）

---

**基于:** Vercel React Best Practices v1.0.0 | 全部 57 条规则
