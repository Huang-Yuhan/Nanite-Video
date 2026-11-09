# Nanite-Video

**代码驱动的 Nanite 算法动画，不使用 AI 视频生成。**

## 第一期正式工程：Episode01Workprint

> 状态：第一章镜头的工程原型，**不是整期成片**。当前使用无配音的算法 animatic；总片长不设限制。正式的六章脚本见 `scripts/episode-01/`。

`src/episode01/` 是第一期正式视频的独立代码入口：

- `Episode01.tsx`：使用 Remotion `Sequence` 的工作版时间轴；逐章接入后延长时长，不渲染尚未实现的章节占位图。
- `ch01Geometry.ts`：一张连续的、可复现的三维岩壁网格；为整块 Mesh Fine、整块 Mesh Coarse、局部 Fine + 其余 Coarse 三种表示构造真实三角形集合。
- `Chapter01.tsx`：第一章的程序化几何动画——岩壁出场 → Wireframe → Whole-mesh LOD 切换 → 近处低精度的问题 → 局部 LOD → Cluster 概念铺垫。

**本阶段只演示 LOD 的粒度问题**：10 条相连的教学网格条带，每条 Fine 96 tris、Coarse 24 tris；完整 Fine 960 tris，完整 Coarse 240 tris，局部 Fine 456 tris。每个条带的竖向边界采样保持一致，粗细混排也不产生裂缝；上下外轮廓是同一条几何线，但 Fine 的边缘分段可能更多。这里的条带仅是局部精度示例，**不是 UE 5.8.4 Graph Partition 生成的真实 Cluster**。

```bash
npm install
npm run studio                     # 选择 Episode01Workprint
npm run validate:episode01        # 验证 3 种网格的数量、流形边界与混排接缝
npm run check
npm run still:episode01-local     # out/episode-01-local-lod.png
npm run still:episode01           # out/episode-01-clusters.png
npm run render:episode01          # out/episode-01-workprint.mp4
```

当前 workprint 为 **1920×1080 / 30fps / 36 秒**，只是第一章 animatic 的暂定节奏，不代表整期长度。所有镜头由帧号纯函数驱动，可以任意跳转和重现。CI 只验证类型、拓扑和代表性静帧；**完整 MP4 的节奏与画面仍需要在 Studio 中评审**。

保留 `ClusterDagDemo` 作为算法实验参考，不再把它当作第一期的正式视觉模板。之前的 Camera ↔ DAG Cut Draft PR #3 也不会阻塞这一阶段的开发。

---

## 第二章工程原型：Triangle Clustering

本 PR 在第一章 `feat/episode-01-chapter-01` 的工作版时间轴后追加 **Chapter 02**。第一章与第二章使用**相同的三角形顶点数据**，不切换到无关的演示资产。

- 从第一章岩壁的细节区域截取一块 **4×4 Quad = 32 Triangle** 的真实子网格。
- 根据共享 Mesh Edge 生成 Triangle Adjacency Graph：**32 Nodes / 40 undirected Edges**，每条 Graph Edge 都对应一条真实共享三角形边。
- 对比相同 **4 Clusters × 8 Triangles** 的两个 Partition：按索引步进分组（可能离散）与基于 2×2 Quads 的连续分组；被切断的邻接边数量由图自动统计。
- 表示从 Triangle 缩为 Graph Node，图边生长，分区选择，最后回到同一片三角形几何。
- 用 `validate:chapter02` 核实节点数、边数、无重复/非流形边、同一 Triangle Budget、连续组连通性以及跨 Cluster Edge Cut 的减少。

这些 Partition 是**用于阐释目标的教学构造**，不是 METIS 输出或 Nanite UE 5.8.4 的实际 Builder 划分。本阶段的 Cluster 大小是 8 Triangles，而不是声称 UE Cluster 固定为 8。

```bash
git fetch origin
git switch --track origin/feat/episode-01-chapter-02
npm install
npm run studio                       # Episode01Workprint: 第一章 + 第二章
npm run validate:chapter02
npm run check
npm run still:episode01-graph        # out/episode-01-graph.png
npm run still:episode01-partition    # out/episode-01-partition.png
npm run render:episode01             # out/episode-01-workprint.mp4
```

第二章目前使用临时 animatic 时长，正式视频无固定片长；本 PR **基于第一章 PR #4 的分支**，合并时应先落地 PR #4，再调整本 PR 的 base。

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
