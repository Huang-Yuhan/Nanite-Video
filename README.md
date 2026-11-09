# Nanite-Video

**代码驱动的 Nanite 算法动画，不使用 AI 视频生成。**

## Runtime Demo：Camera ↔ DAG Cut（独立预览）

这段演示是第一期《Nanite：从 Mesh 到 Cluster DAG》结尾的**最小 Runtime LOD 选择闭环**：左侧摄像机逐步接近网格，右侧依赖 DAG 的合法 Cut 随误差变化。它不是 UE 5.8.4 GPU Runtime 的逐函数复刻，也**不展示 BVH**。

在已验证的原 Demo 数据之上，`src/runtimeCutData.ts` 给出两个共享外部接缝的 Mesh Patch。每个 Patch 都具有 4 fine / 2 coarse Clusters；Group A 的教学误差随 Camera 靠近跨越 1px 阈值，发生完整的 2 coarse → 4 fine 替换；Group B 保持 coarse。使用同一个 `RuntimeFrame` 驱动左侧的 Mesh LOD 和右侧被选中的 DAG 节点，确保两个画面不会各自硬编码状态。

**运行方式（Node.js 22）：**

```bash
npm install
npm run studio               # 在 Studio 中选择 RuntimeCameraDagCut
npm run validate:geometry
npm run validate:runtime     # 逐帧检查合法 Group 切换及两个 Mesh 的边界
npm run check                # TypeScript 类型检查
npm run still:runtime        # out/runtime-cut-cover.png
npm run render:runtime       # out/runtime-camera-dag-cut.mp4
```

`RuntimeCameraDagCut` 是 **1920×1080 / 30 FPS / 18 秒** 的独立技术演示，时长不是正式影片的时长限制。场景右侧是 **LOD dependency DAG / Cut**，不是用于 Runtime Culling 的 BVH/Hierarchy。Camera/GPU 投影误差使用有意简化的模型 `E = 5*e/max(distance-to-sphere, 0.25)`；1px 阈值和 error 数值均是**教学设定**。这段演示采用真实的 fine/coarse 三角形集合切换，**不以连续形变冒充 Nanite 的运行时顶点插值**。

当前代码作为基于 ClusterDagDemo PR 的**叠加 PR**，直到原 Demo 合入主分支前依赖它；两者均不会修改脚本文档 PR #2。

---

## 25 秒 Demo：从 Cluster 到 DAG

这版借鉴 3Blue1Brown 的可视化方法：**几何是画面主体，图形通过连续变化推导算法**；不再使用固定左右分栏、HUD 仪表盘或 PPT 式流程列表。

### 本地预览

推荐 Node.js **22**（npm），项目无需 UE、Blender 或本地三维资产：

```bash
npm install
npm run studio
```

在浏览器里选择 `ClusterDagDemo` 并拖动时间轴。

```bash
npm run check
npm run validate:geometry
npm run render
```

MP4 输出：`out/cluster-dag-demo.mp4`，**1920×1080 / 30 FPS / 25 秒**。

静帧预览：

```bash
npm run still
```

静帧输出：`out/cover.png`。

### 分镜

| 时间 | 视觉叙事 |
| --- | --- |
| 0–5s | 三角形网格逐渐被划分并标记为 4 个 fine Clusters |
| 5–9s | 逐步描出 Cluster Group 的外边界；内部联系淡化 |
| 9–17.8s | **8 次实际的内部 Edge Collapse**，32 tris → 16 tris |
| 17.8–20.2s | 对简化结果重新划分，得到 2 个 coarse Clusters |
| 20.2–25s | fine/coarse 的三角形块**连续缩成图节点**，形成多对多 DAG 关系 |

**注意：** 本 Demo 的 LOD 构建是一个经过校验的教学模型，并非 UE Nanite 的真实 DagBuilder 运行记录。它用于说明 Group 边界约束、局部边折叠、重新划分和多对多依赖。

### 数据与正确性

`src/demoData.ts` 包含 5×5 顶点网格和 8 次显式的 Edge Collapse：

- 32 → 30 → 28 → 26 → 24 → 22 → 20 → 18 → 16 三角形
- 每次折叠均满足两面内部边、**link condition**、平面三角形方向约束
- 每次折叠后验证外轮廓顶点及边完全不变
- fine: 4 个 Cluster，每个 8 triangles
- coarse: 2 个 Cluster，每个 8 triangles
- DAG 可视化展示一个 Group 的替代关系，**不代表各个 coarse Cluster 可以独立切换**

Edge Collapse 动画让被移除的顶点逐步移到保留顶点，相关三角形在变为退化面后消失，然后拓扑切换到下一份离线预计算的快照。

### 实现

- **Remotion**：负责时间轴与 MP4 合成
- **3D 顶点 + 数学投影 + SVG**：演示三维曲面拓扑，所有线条、节点、连线保持矢量画质
- **React / TypeScript**：渲染全部数学动画
- `useCurrentFrame()`：每一帧由时间直接计算，任意跳转帧号可以重现同一状态

这个 Demo 暂时使用数学投影而不采用 WebGL：算法几何只有几十个三角形，SVG 更适合 3Blue1Brown 风格的边折叠和图形变换，也避免离线渲染的 WebGL 初始化问题。后续处理高精度 UE Mesh、真实遮挡或更复杂三维镜头时，可以重新加入 Three.js。

### 已知限制

- 没有配音；目前文字是临时的视觉辅助。
- 不是按真实 Nanite 的 Mesh Simplifier 输出逐步录制；数据在源码里明确标为教学例子。
- 这里不模拟 Nanite 的运行时 BVH、Cut Selection、Culling 或 Streaming。
- 当前执行环境无法安装 npm 依赖并跑 Chromium，所以**还没有完成实际 Remotion 端到端渲染**；以你的本地 Studio 或 PR CI 的结果为准。
