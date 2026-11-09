# Episode 01 · Technical Notes / 事实核验清单

> 状态：技术评审稿。下列「经典 Nanite」主要指 SIGGRAPH 2021 公开方案，不等价于确认了 UE 5.7.4 中所有具体类型、常量及函数行为。

## 主要公开来源

1. Brian Karis, Rune Stubbe, Graham Wihlidal, *Nanite: A Deep Dive*, SIGGRAPH 2021 Advances in Real-Time Rendering in Games，完整幻灯片与演讲注释： https://advances.realtimerendering.com/s2021/Karis_Nanite_SIGGRAPH_Advances_2021_final.pdf 。重点阅读标题为 “Build operations”, “DAG”, “DAG: Which clusters to group?”, “Initial clustering”, “Simplification”, “Error metric”, “LOD selection in parallel” 的部分。
2. Epic 官方 *Nanite Virtualized Geometry Overview*： https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-virtualized-geometry-in-unreal-engine 。供系统定位与产品使用范围参照；网页可能显示比本项目计划的 UE 5.7.4 更新的版本。
3. Epic 官方 *Nanite Technical Details*： https://dev.epicgames.com/documentation/en-us/unreal-engine/nanite-technical-details 。用于可视化功能及运行时说明，不能代替特定版本的 C++ 源码核对。
4. Michael Garland and Paul S. Heckbert, *Surface Simplification Using Quadric Error Metrics*, SIGGRAPH 1997： https://www.cs.cmu.edu/~garland/Papers/quadrics.pdf 。用于第五章基本 QEM 公式背景；不要从基础 QEM 公式推断所有 Nanite 的最终误差实现。

## 已核对的经典设计（SIGGRAPH 2021）

### Build Pipeline

- 先将原始三角形构建为叶子 Clusters；经典演讲示例的 Cluster 目标为 128 triangles。
- 反复：Group clusters → Merge shared triangle list → Simplify to roughly 50% triangles → Split back into Clusters；直到获得最粗层级。
- “4 fine → 2 coarse” 是 SIGGRAPH 演讲中的**教学简化例子**（示意用 4-triangle clusters），不是完整真实资产的固定尺寸要求。
- 简化时 Group 对外边界保持不变，故同一轮简化产生的 fine/coarse 几何集合具有相容外边界。运行时不是逐个 fine 独立替换任意 coarse。
- Merge 与 Split 的组合形成多对多依赖 DAG 而非简单 Tree；新的分组允许旧边界在未来变成内部边从而继续简化。**边界自由度来自构建算法本身，不是 DAG 数据结构自动释放了约束。**

### 两次 Graph Partitioning

- 叶子 Clustering：图节点是三角形，图边连接共享边的相邻三角形；经典方案重点优化边界边数与 Cluster triangles 预算；边界数量、空间包围范围、顶点数等是互相关联的考虑因素。
- 高层 Grouping：图节点是 Cluster；直接相邻 Cluster 的图边权重与共享 triangle edges 的数量相关，也可为几何上很近但不直接连通的 Cluster 增设连接；经典演讲使用 METIS。
- **不要把「最小 edge cut」讲成实际系统所有输入下的绝对全局最优解**：实际有组大小等约束，算法采用启发式/近似分区。
- **不要把“cluster 必须空间紧凑”当成第二章唯一数学目标**：经典演讲专门解释优化对象的取舍。

### Simplification / Error

- QEM-based Edge Collapse 用来估计候选折叠与优化顶点位置。带属性误差、面积归一化等会影响成本和结果。QEM 的平方误差代价**不能直接当作像素误差**。
- 简化阶段还输出可用于 LOD 层级与屏幕投影判断的误差估计；「QEM cost」「simplification error」「accumulated hierarchy error」「projected screen error」是教学上的用途区分，**不意味着有四个互不相关的引擎模块**。
- 用于并行选择的核心条件是：从 parent 到 child 的**视图投影误差需要单调**，保证阈值沿依赖路径只有一次有效过渡。经典演讲指出构建阶段会修正父级存储的误差与用于投影的 bounds。
- **离线误差标量单调，不自动保证任何 Camera 下的屏幕投影误差单调**；正式旁白必须同时提醒 bounds。
- 透视近似 e_px ≈ e_world * H / (2 z tan(fovy/2)) 仅用于一维深度与小误差直觉。实际要考虑 error bounds 的最近点与实例缩放等。

### DAG、Cut、BVH 的措辞

- “一个 Group 的整个 fine 集合可以被一组 coarse Cluster 共同替换”，是脚本中的核心视觉原则。
- 不能说「DAG 上任意节点子集都是合法 Cut」，也不能推导出每个 Cluster 都可以单独切换精度。
- DAG 表示几何层级依赖；Runtime 的遍历/剔除加速结构需要单独说明。**不能粗暴地断言 BVH 与 DAG 完全互不关联，或它们是同一个概念**；后续以实际版本的 hierarchy nodes/build steps 核对。
- “LOD Cut” 在 EP01 只讲组级替换和依赖的直观含义；GPU 上按误差阈值并行选择的细节留给 EP02。

## 与 UE 5.7.4 源码核对的 TODO（未声称完成）

| 优先级 | 待核对问题 | 剧本影响 |
| --- | --- | --- |
| P0 | DagBuilder 中 Grouping 与层级依赖的真实实现：Group ID、child-parent 关系如何记录？ | 第四章的图示和少量 C++ 结构截图 |
| P0 | Cluster 三角形预算、Group size、终止条件在当前平台/版本的常量及例外 | 第二、三章旁白中避免硬编码 |
| P0 | 简化器如何锁定边界；哪些几何、属性与误差统计实际输出 | 第三、五章准确性 |
| P0 | Error 与 bounds 在层级上的保守传播 / fix-up 如何保证 projected monotonicity | 第五章的关键动画 |
| P1 | Initial Triangle Clustering 的具体图构建与分区算法，是否继续使用 METIS/改造接口 | 第二章实现贴近度 |
| P1 | DAG 与 runtime hierarchy/BVH 的构建关系、序列化字段 | 第一、二期衔接 |
| P2 | 数据压缩、Streaming、Pages、material ranges 的关联结构 | 第二期，不在本 PR 细讲 |

## 表述风险与建议修订

- 不说「Nanite 不再受多边形预算约束」：实际预算和限制仍然存在。应说「把超高精度资产的处理交给自动构建/按需渲染，显著改变了开发者的工作方式」。
- 不说「局部 LOD 是 Nanite 首创」：可以简短承认已有其他分块/层次 LOD 技术。
- 不把 Group boundary 解释为完全没法动的所有边：只在**该次 Group 简化操作**的边界约束意义下使用「保持不变」。
- 不宣称「QEM 保证真实视觉无损」：误差是启发式估计，法线、UV、材质、剪影等视觉影响仍有区别。
- 不说「Hierarchy 单调后整个 DAG 就可以直接当 BVH 做可见性裁剪」：两个职责不相同。
- 代码截图中若出现具体 UE 5.7.4 文件路径、符号，必须在实际源码读取后填入。本文档不编造代码行数、函数名或精确常量。

## 技术验收门槛

正式上线前技术评审需要看到：一张真实的 fine/coarse 同边界示意、一条保守有效的多层误差/Bounds 演示、一个对照解释「Clustering 和 Grouping 是两次不同粒度 Partitioning」的镜头、以及任何 UE 5.7.4 具体实现引用的源码证据。
