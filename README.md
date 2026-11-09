# Nanite-Video

**代码驱动的 Nanite 算法动画，不使用 AI 视频生成。**

## 第一期视频 · 六章完整视觉工作版

这是一条**已实现六章镜头的 Remotion 可渲染工作版**，不是只有第一、二章的旧 Demo。与 `scripts/episode-01/narration.md`（剧本 V0.5）配套。工程的实际章结构：

| 章节 | 实现 | 演示关键点 |
| --- | --- | --- |
| 01 为什么需要局部几何 LOD | `Chapter01.tsx` | 同一岩壁 Fine / Coarse / Local 三种三角拓扑 |
| 02 Triangle Clustering | `Chapter02.tsx` | 32 triangle dual graph、共享边、两种分区 |
| 03 Grouping & Simplification | `Chapter03.tsx` | 四个 Fine Cluster 聚合，锁外边界，八次合法内部 Edge Collapse，16-tri 两个 Coarse Cluster |
| 04 DAG 与合法 Cut | `Chapter04.tsx` | Group 级 4 fine ↔ 2 coarse、为何非唯一 Tree Parent、拒绝任意局部混选 |
| 05 Geometric Error & Bounds | `Chapter05.tsx` | QEM 直觉、Sample Error、LODBounds Union、误差单调性、屏幕误差阈值 |
| 06 Runtime 选择闭环 | `Chapter06.tsx` | Camera 改变 Projected Error，合法 Group Cut 切换；BVH/Culling 留到第二期 |

**技术限定**：三角形数据、合法的内部 edge-collapse 序列和分区图来自本项目的教学网格，具有拓扑测试；不是 UE 5.8.4 的真实 Simplifier 导出结果。第五章的 Sampling Error 是几何比较教学代理值，区别于 QEM 平方代价及真实 `SimplifyError`；一像素阈值也是教学值。UE 5.8.4 的 Builder 数据与字段参考 `scripts/episode-01/ue-5.8.4-source-review.md`。Runtime 精确 GPU 投影公式没有在此伪装成已经验证。

### 运行与视频输出

```bash
npm install
npm run check
npm run validate:all
npm run studio                         # 选择 Episode01Workprint
npm run render:episode01              # 全尺寸 1920x1080 / 30fps MP4
npm run render:episode01-preview      # 完整 960x540 MP4 预览版本
```

输出：`out/episode-01-workprint.mp4` 或 `out/episode-01-complete-preview.mp4`。

工作版使用 **309 秒 / 30 fps** 的内容驱动时间轴（不是正式版时间约束）。所有镜头均由帧号确定性生成，任何帧都可以直接 seek 并渲染；关键镜头静帧：

```bash
npm run still:episode01-local
npm run still:episode01-graph
npm run still:episode01-partition
npm run still:episode01-group
npm run still:episode01-dag
npm run still:episode01-error
npm run still:episode01-runtime
npm run still:episode01-outro
```

CI 的 `Demo typecheck and frame render` 校验全部拓扑、类型及六章代表性帧；`Episode 01 full visual workprint` 负责导出完整六章的 960×540 MP4，并作为 GitHub Actions Artifact 上传。

### 已有与待完善的内容

- **已具备**：六章时间轴、几何拓扑驱动的动画、真实共享边、边界锁定的折叠序列、DAG 组级依赖图、误差可视化、最终 Camera/Cut 选择示意、CI 验证、完整 MP4 导出指令。
- **尚未具备**：正式中文旁白音频及同步配音节奏、原始高质量岩壁资产、美术级光照/材质、声音设计、真实 UE5.8.4 测量曲线和逐镜头的最终视觉审查。因此目前定位为**完整视觉工作版（silent workprint）**，不应冒称已经做完最终可发布的配音成片。

保留旧的 `ClusterDagDemo` 用于算法实验。曾经的 Runtime Camera / DAG 双栏 Draft PR #3 不是本版的正式视觉模版。

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
