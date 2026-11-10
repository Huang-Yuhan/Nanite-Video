# Nanite-Video

基于 Remotion、React 和 TypeScript 制作的 Nanite 原理动画。**本仓库仍是无配音的视觉工作版**，不是 UE 画面录制；教学用的模型、三角形拓扑、LOD 选择与投影误差都有独立的近似/验证边界。

## 运行

要求 Node.js 22，执行：

```bash
npm install
npm run studio
```

在 Remotion Studio 中选择 **Episode01Workprint**，然后拖动播放头查看任意帧。导出：

```bash
npm run check
npm run validate:all
npm run render:episode01-preview    # 960 × 540 工作版
npm run render:episode01            # 1920 × 1080 完整分辨率
```

## 如何调整第一章时间轴

第一章改为 **六个独立、具名的 `Sequence`**，在 Studio 时间轴中可以分别找到：

| 顺序 | 镜头 | 当前时长 |
| --- | --- | --- |
| 00 | 空背景与三段引入字幕：三角形开销、远处细节、引出 LOD | 15 秒 |
| 01 | 同一模型的四级传统 LOD | 8 秒 |
| 02 | 相机由远到近；右侧 LOD List 半透明框高亮 | 15 秒 |
| 03 | 回到岩壁，解释传统 whole-mesh LOD 局限 | 21 秒 |
| 04 | 几何复杂度与屏幕像素关系 | 13 秒 |
| 05 | 岩壁显示分区，过渡到 Triangle Clustering | 8 秒 |

**修改时长：** 编辑 [`src/episode01/chapter01/Timeline.ts`](src/episode01/chapter01/Timeline.ts) 中每个 `seconds`，保存后 Studio 会热更新。后续章节的起始位置和视频总时长会自动跟着变化。

**修改镜头：** 编辑 [`src/episode01/chapter01/Shots.tsx`](src/episode01/chapter01/Shots.tsx)；模型和绘制函数集中在 [`Visuals.tsx`](src/episode01/chapter01/Visuals.tsx)。每个镜头的帧号从零开始，关键动画大多使用 `u`（0→1 的本镜头归一化时间），因而改变镜头时长时，机位推进和 LOD 切换会随之伸缩。

**需要注意：** Remotion 是代码驱动的视频工具。Studio 时间轴可以浏览/定位具名的 `Sequence`，但此工程没有实现 Premiere 式拖动片段后自动持久化到源文件的编辑器；**`Timeline.ts` 才是时长的唯一来源**。如果修改第一章的总时长，记得同步更新 `package.json` 里那些 `still:episode01-*` 的绝对 `--frame` 截图位置（特别是后续章节），以及 CI 用到的代表帧。剪辑工作推荐先确认镜头节奏，再固定 CI 截图帧。

## 目录

```text
src/
  root.tsx                   # Remotion Composition 注册
  episode01/
    Episode01.tsx            # 六个章节的顶层时间轴
    Chapter01.tsx            # 第一章六个具名 Sequence
    chapter01/
      Timeline.ts            # 镜头排列及其秒数：优先改这里
      Shots.tsx              # 六个镜头的动画与文字
      Visuals.tsx            # 岩壁、模型、投影、公共绘制
    traditionalLod.ts        # 真实岩石四级 LOD 数据和切换验证
    ch01Geometry.ts          # 多章共用的教学岩壁数据
    Chapter02.tsx            # Triangle clustering
    ch02Graph.ts             # Triangle adjacency/partition 数据与验证
    Chapter03.tsx            # Cluster group / simplification
    ch03Hierarchy.ts         # 合法 edge collapse 与误差代理值
    Chapter04.tsx            # DAG 与合法 Cut
    lodDagTeaching.ts        # 多层 Group Cut 教学数据与验证
    Chapter05.tsx            # Error / Bounds
    Chapter06.tsx            # 运行时概念连接
    visuals.tsx              # 第 3–6 章共享绘制
```

## 六章内容及技术边界

1. **传统 LOD → Nanite 动机**：展示离散 whole-mesh LOD、局部几何需求、屏幕像素原则；传统 LOD 镜头使用 Poly Haven 的 Moon Rock 02 实物扫描资产及作者已有的 LOD0–3（3304 / 1652 / 826 / 412 三角形），未自行简化。来源、许可和导出方式见 [`assets/models/moon-rock-02/`](assets/models/moon-rock-02/)。后续岩壁仍为教学几何。
2. **Triangle Clustering**：展示真实共享边构造的 Triangle Adjacency Graph 与教学分区，不冒称 METIS 的实际划分结果
3. **Grouping & Simplification**：四个 Fine 聚合、锁 Group 外边界、八次拓扑验证的 Collapse、再划为两个 Coarse
4. **Cluster DAG**：先讲单 Group 的 4→2，再用独立构造的多层依赖示例展示合法 Cut；不把 DAG 当成运行时 BVH
5. **LOD Error / Bounds**：区分 QEM 的平方平面距离、采样得到的教学误差与 UE 的 Simplifier Error；屏幕误差阈值同样为演示值
6. **Runtime 总结**：通过相机与示意误差连接离线构建和运行时选择，实际的 GPU Hierarchy / Culling / Rasterization 留到后续介绍

参考资料及 UE 5.8.4 源码对照：[`scripts/episode-01/`](scripts/episode-01/)。

## 当前进度

第一章的镜头结构和全片六章工作版已可运行，项目包含 TypeScript、拓扑不变量、关键帧和完整 MP4 的 GitHub Actions 验证。仍需进行实机观看/镜头节奏审查、配音、材质与真实资产等制作工作。

旧版 `ClusterDagDemo` 保留作算法实验，不代表第一期目前的最终镜头语言。
