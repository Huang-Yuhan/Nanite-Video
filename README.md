# Nanite-Video

用代码生成 Nanite 技术介绍视频；**不使用 AI 视频生成**。

当前 PR 包含一个 18 秒的程序化样片：三维几何 + 二维 DAG / 构建流程可视化。

## 本地预览

需要 Node.js 20+、npm，推荐支持 WebGL 的 Chromium 运行环境。

```bash
npm install
npm run studio
```

在浏览器打开 Remotion Studio，选择 **ClusterDagDemo**，可以播放、暂停、逐帧拖动时间轴。

## 导出 MP4

```bash
npm run render
```

输出文件：`out/cluster-dag-demo.mp4`（1920×1080、30fps、18 秒）。

只生成静帧：

```bash
npm run still
```

如果 Linux 上 ANGLE 无法初始化 WebGL，可尝试：

```bash
npx remotion render src/index.ts ClusterDagDemo out/cluster-dag-demo.mp4 --gl=swangle --concurrency=1
```

## 演示内容

| 时间 | 内容 |
| --- | --- |
| 0–2.2s | 初始三角网格 |
| 2.2–4.7s | 四个 fine Clusters 着色 |
| 4.7–7.2s | 标记 Cluster Group 外边界 |
| 7.2–10s | 预计算的细/粗几何状态过渡 |
| 10–12.3s | 两个 coarse Clusters |
| 12.3–18s | 四对二、多对多 DAG 依赖图 |

### 几何是否准确？

这是**教学几何**，不是 UE Nanite 的真实 DagBuilder / 简化器导出数据：

- fine 是 4×4 网格（32 三角形），分为 4 个 Cluster，每个 8 tris。
- coarse 使用同一个外轮廓的 16 个边界顶点与 1 个内部顶点，形成 16 三角形，分为 2 个 Cluster，每个 8 tris。
- 两份网格共享**完全相同的外边界顶点与边**，不存在边界缝隙。
- 演示了 4 个 fine Cluster 与 2 个 coarse Cluster 的一组整体替代关系，不意味着运行时可任意单独切换。
- 几何过渡采用预计算的前后状态**交叉淡入淡出**，**不代表实际 Edge Collapse 的每一步**。

## 项目结构

```text
src/
  demoData.ts       # 可验证的几何、Cluster 和 LOD 替代关系
  ClusterDagDemo.tsx# Three.js 场景 + React/SVG HUD + 时间轴
  root.tsx          # 1080p / 30 FPS Composition
  index.ts          # Remotion entrypoint
remotion.config.ts  # WebGL 后端选择
```

动画完全由 `useCurrentFrame()` 驱动，可任意 Seek；不依赖非确定性的 `useFrame()` 累积状态。

## 后续迭代

演示的首要目标是**视觉效果验证**。以后可以从 UE 5.7.4 的构建期导出真实 Cluster Group、边界和简化结果，以同一套时间轴替换这些教学几何。

**注意：** 此工程没有在当前执行环境中完成 `npm install` / Chromium 实测渲染（npm registry 连接不可用）。请在本地通过 Studio 验证。如遇错误可以将日志贴到 PR。
