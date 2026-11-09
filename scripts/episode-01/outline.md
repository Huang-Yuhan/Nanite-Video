# Nanite 技术解析（一）：从 Mesh 到 Cluster DAG

> 状态：脚本技术审稿 V0.5（2026-11-09）；**不是最终逐字录音稿**。本 PR 只包含文档，不修改视频代码。
>
> 受众：游戏引擎与实时渲染程序员；默认了解 Mesh、LOD、Triangle、GPU Rasterization。
>
> 风格：3Blue1Brown 式的连续算法可视化，以几何变换解释推导，不使用固定的 PPT 分栏或左上角 Logo。
>
> 目标：构建期的算法设计，不是 UE 5.8.4 逐函数源码教程。真实性以 SIGGRAPH 2021 Nanite 公开方案为基准，正式制作前核对具体 UE 版本。

## 影片主问题

给定一个超高精度的三角网格，如何自动构建一种数据表示，使其能够在不同区域使用不同 LOD、避免相邻块裂缝，并为 Runtime 提供可高效选择的几何和误差信息？

从问题出发推导：**局部 LOD 需求 → Triangle Clustering → Cluster Group → Merge / Simplify / Split → DAG → Error / Bounds**。

## 六章叙事结构（不设视频时长上限）

| 章节 | 希望观众回答的问题 | 章节出口 |
| --- | --- | --- |
| 01 为什么需要局部几何 LOD？ | 为什么单个 Mesh 的整体 LOD 有时不够灵活？ | 把 Mesh 划分为细粒度的几何单元 |
| 02 Triangle Clustering | 如何让 Cluster 大小受限且尽量减少跨 Cluster 边？ | 得到初始 fine Clusters |
| 03 Grouping & Simplification | 独立简化会有什么问题？怎样让简化更自由？ | 得到一组等边界的 coarse Clusters |
| 04 为什么产生 DAG？ | 为什么 Merge / Split 不能用普通父子 Tree 表达？ | 生成递归 LOD 依赖，理解组级替换 |
| 05 Geometric Error & Cut | 如何让 Error / Bounds 真正驱动视角相关的 LOD 选择？ | 单调投影误差、Camera 靠近、DAG 合法 Cut 变化 |
| 06 完整回顾与衔接 | 已解释为什么选某种 LOD，那么 GPU 怎样高效找到并渲染？ | 接第二期 Hierarchy Traversal、Culling、Rasterization |

**无目标片长、无硬性时码。** 每章完整讲清一个问题；讲完再停。需要让观众看清的 Grouping、Edge Collapse、多对多依赖和 Error / Bounds 动画可以保留自然观察时间，旁白不必一直说话。制作 animatic 后只检查是否冗余、是否理解充分，不为凑时间剪掉必要的技术内容。

## 章节之间的因果关系

1. **开场不要踩传统 LOD**：整个 Mesh 一个 LOD 的局限是选取粒度；分块地形、Progressive Mesh 等早已有局部 LOD。Nanite 的价值在于自动化层级几何构建与对应的运行时管线。
2. **第二章只讲叶子 Cluster 划分**：每个三角形成为图节点，共享边成为图边；再解释为什么要减少 cut edges；仅用经典实现中的 128 triangles 作为背景参数，不当作版本无关的硬性定理。
3. **第三章只解决几何构建**：分别简化会导致共享边潜在不匹配；若锁定全部 Cluster 外边界，又约束了简化；通过新一轮以 Cluster 为图节点的分区，把相邻 Cluster 合并成 Group；锁住 Group 的外轮廓，在组内简化并重新分簇。
4. **第四章只讲层级关系**：组级替换是 4 fine ↔ 2 coarse，而不是「每个 fine 各有一个唯一 coarse parent」。重复构建让旧边界有机会变为新 Group 内部边。引出合法 Cut 的概念，但不讲完整 GPU 选择算法。
5. **UE 5.8.4 源码核对**：`ClusterDAG.cpp` 的 `ReduceGroup` 汇总 children 的 `LODError`、`LODBounds`，新生成的 coarse parents 共享合并后的 LOD 数据。不要误说 fine children 的 LOD Error 原本都相同。
6. **第五章是 Error/Bounds 到 Runtime 的闭环**：QEM 只是解释简化代价的入口；区分内部 cost、层级误差和屏幕误差；再用**临时左右同步画面**，左边 Camera 靠近同一 Mesh、右边 DAG 合法 Cut 局部替换，说明 Error 究竟如何决定所需几何精度。
7. **第六章总结“构建信息如何服务运行时选择”**：聚焦分层 Cluster 几何、依赖关系、误差和 Bounds → Camera 下的概念性 LOD Cut；压缩、Streaming、真正 GPU 并行遍历/Culling、硬件/软件栅格化留到第二期。

## 声画语言

- 同一份 Mesh 从开场到片尾贯穿，必要时镜头推进到一小块更易观察的三角形区域。
- 先展示**问题发生**，再让一种设计作为解决方案自然出现；只有在观众见过动作后才出现公式与术语。
- 颜色表示 Cluster ID 或关系类型，跨章节保持一致；Group 外边界使用金色，待简化边使用暖色。
- 第三、四章沿用 Demo 的 4 fine → 2 coarse 教学例子；简化动画必须依据合法拓扑操作，而不是直接 Cross Fade。
- SVG / 2D 图解与 3D Mesh 来源于相同的 Cluster/Group 数据，几何逐渐抽象成节点。
- 不加入固定章节侧栏、状态仪表盘、角标；只在必要时出现一行术语、短公式或几何计数器。
- 旁白、动画要一一对应；不把一整段旁白压在静态画面上。
- 第五章末尾唯一的双视窗实验由镜头内对象连续移动形成：左 Camera + Mesh，右 DAG Cut。**这不是贯穿全片的 PPT 侧栏**；右边不画 BVH，避免混淆构建依赖和运行时遍历结构。

## 贯穿全片的数据资产

- **主 Mesh**：大型连续岩壁或有起伏的三维表面，用于开场与整体层级。
- **教学补丁**：一块小网格，在同一真实拓扑上展示 Triangle Adjacency、Partition、Boundary 和 Edge Collapse。
- **Cluster / Group IDs**：从几何投影到 Graph、DAG 时保持 ID 稳定。
- **Transition records**：某次 Grouping 的 fine set、coarse set、边界与简化前后几何，用于组级替换动画。
- **Error records**：Cluster/Group 层级误差及 bounds，用于第五章。
- **LOD selection records**：给 Camera 轨迹、误差阈值及每一状态下完整、合法的 Cluster 选择集合；以相同 GroupTransition 数据驱动左 Mesh 与右 DAG，确保选中集合可验证。

动画数据优先使用可验证的教学输入；计划接入 UE 导出数据时，需要区分教学示意与真实引擎结果。

## 与第二期的边界

第二期暂定《Nanite 原理解析（二）：GPU 如何高效选择并渲染几何？》：从第一期的 Camera / DAG Cut 结果出发，深入讲 Runtime Hierarchy/BVH 遍历、可见性剔除与 GPU 并行选择、硬件/软件 Rasterization、Visibility Buffer、Streaming。第一期**会展示一个概念性的 Runtime LOD Cut 联动实验**，但不讲完整 GPU 执行路径。

## 本 PR 的评审重点

- 因果链条能否让熟悉渲染的观众在不看 PPT 的情况下跟上？
- 「为什么是 DAG」的表达是否足够精确，是否误导成每个 Cluster 可独立切换？
- 第五章是否偏离了 Offline Build 主线？
- 各技术步骤是否有充分的观察时间？是否存在纯粹为了控制片长而过早跳过的推导？
- 哪些句子需要 UE 5.8.4 实际源码确认？参见 technical-notes.md。

## 文档

- narration.md：全片旁白草稿（每章标出可视化停顿，具体时长需要配音试读）
- storyboard.md：按镜头组织的动画对象、变化、旁白与可验证条件
- technical-notes.md：来源、技术表述边界、UE 版本核验 TODO
