# Nanite-Video

**代码驱动的 Nanite 算法动画，不使用 AI 视频生成。**

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
