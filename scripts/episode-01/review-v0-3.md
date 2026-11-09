# Episode 01 · 第一轮技术审稿记录（V0.3）

> 当前结论：保留六章结构，优先修正技术措辞；**不设置总时长或每章硬性时间预算**。此文件用于评审，暂不代表全部技术问题已通过 UE 5.8.4 源码核对。

## 叙事判断

- **Ch01 → Ch02**：由整体 Mesh LOD 的选择粒度，引出可自动构建的局部几何；明确「局部 LOD 并非 Nanite 首创」，不通过贬低已有技术开篇。
- **Ch02 → Ch03**：初始 Clustering 的边界较少，有利于之后简化；第三章再使用独立简化造成边界不匹配的实验，引出 Cluster Group。
- **Ch03 → Ch04**：第三章只做 Group → Merge → Simplify → Repartition；第四章仅将已有几何替代关系抽象成依赖图，避免重新播放完整简化步骤。
- **Ch04 → Ch05**：第四章介绍 group 级替换的合法性，提出「怎样判断某组 coarse 几何是否足够好」；第五章从简化代价逐步引到累计误差、Bounds 和屏幕投影。
- **Ch05 → Ch06**：保留误差单调性动机，运行时具体选择条件交给第二期，不在这里深入 GPU 算法。

## 关键技术审稿意见

### P0 · 第四章明确 DAG 的限定条件（已修改 narration.md）

- 说「**在这套 Grouping / Merge / Split 关系下**生成的是多对多 DAG」，不要绝对宣称 Tree 完全不可能用于局部 LOD。
- 说「一个 Group 的全部 fine 集合与一组 coarse 集合共同构成替代关系」，而非每个 fine Cluster 可以单独找一个 coarse parent。
- 说「满足依赖与覆盖条件的合法 Cut」，不能让观众以为 DAG 任意节点子集都是合法。
- 再次 Grouping 可以让原先锁定的边界变为新 Group 内部边；**DAG 是依赖记录，并非释放边界的原因**。

### P0 · 误差与 Bounds 继续核查

- 第五章不要把 QEM collapse cost、LOD 误差和投影屏幕误差混成一个量。
- 单调性应发生在运行时使用的投影误差判断意义下；仅显示 e_parent >= e_child 这一个数字关系，不足以解释任何视角下的正确性。
- 正式制作前对照 UE 5.8.4 DagBuilder / simplifier 的误差传播与 bounds 修正规则。
- 动画中的无单调性错误例子只能是**人为构造的教学数据**，不能称作实际 Nanite 构建输出。

### P1 · 两次 Partitioning 需要可验证的不同输入

- Initial Clustering：Triangle adjacency graph、每组 triangles 上限、cross-cluster cut 边。
- Grouping：Cluster adjacency graph、共享边界权重、分区大小约束。
- 两种 Partition 的比较必须保持同一图、同一预算，不要为了视觉效果引入不可比较的分区结果。

### P1 · 章节之间保持同一个几何身份

- 第一章岩壁可以在第二章逐步放大为简化教学 patch；不要让观众以为更换了另一份模型。
- 第三、四章的 4 fine / 2 coarse 使用相同 cluster ID 与真实边界数据，同时驱动网格、抽象节点和依赖边。
- 「边界锁定」画面必须展示本轮 Group 的**外部边界**，不要求所有历史边界永远固定。
- UE 5.8.4 实际源码片段只在已经核对符号和字段后显示；目前文稿未承诺具体 API。

## 剧本剪辑原则（时长不限）

- 镜头长度由观众读懂操作需要的时间决定；允许没有旁白的拓扑变化和数学推导停顿。
- QEM 与误差/Bounds 章节可以比其余章节长，只要每个镜头都能观察到新增的信息。
- 不为了凑时长延长整段静止画面；不为了控制片长跳过必须解释的步骤。
- 完成声音试读和 animatic 后，再记录各镜头真实时长；脚本文本不锁定总片长。

## 仍需评审的问题

1. 是否有必要在第三章的 Graph Grouping 阶段展示 weighted cut 的示例数据？
2. 第四章「合法 Cut」的单镜头应讲到什么程度，才能自然引出第二期？
3. 第五章的 projected monotonicity 是否需要一个独立的 3D bounds 动画？
4. 具体 UE 5.8.4 的简化错误度量、边界约束与 DAG 构建，需要真实源码确认（见 technical-notes.md）。

## 本轮代码与文档范围

本轮仅改文档，尚未修改视频引擎、动画组件或真实 UE 数据导出。所有实现将在脚本讨论后分章节提出独立 PR。


## 第五章第二轮审稿（Error / Bounds）

**已落实在本 PR 的 narration.md、storyboard.md 与 technical-notes.md：**

- 将“误差单调性”的理由从单纯 e_parent ≥ e_child，提升到对象空间误差 + 用于投影的 Bounds 的联合单调。
- 增加同一 Cluster Group 采用共享 Error / Union Bounds 以保证各成员作出一致决策的环节。
- 新增非嵌套 Bounds 的反例，让观众直接看见“误差标量单调但屏幕误差逆序”的失败。
- 为教学推导定义 E ≈ K·e/max(distance(camera,sphere), epsilon)，并说明球的包含关系与最近点距离的联系。
- 第五章分镜由 6 个细化为 9 个，不限制镜头时长。
- 引用 SIGGRAPH 2021 公开技术讲义，但不宣称已完成对 UE 5.8.4 全部误差字段的源码核对。

**后续技术阻塞项**：在录制带具体 UE 实现符号的片段前，需核对现代版本中的 Error/Bounds 传播、组共享数据与 ViewError 投影修正。

## UE 5.8.4 实际源码核对（V0.4）

已验证用户 fork 的 `Build.version = 5.8.4`，并实际阅读 `ClusterDAG.h/.cpp`、`Cluster.h/.cpp`：

- 代码入口为 `FClusterDAG::ReduceGroup`；不是 `DagBuilder.cpp`。版本切换后，具体字段也已不同于先前 5.6.1 的数据。
- 对每个 fine child，保留各自的 `LODError`、`LODBounds`；`Group` 聚合子误差的最大值和子误差球的联合球。
- 本次 `SimplifyTriangles` 返回的 `SimplifyError` 与 `Group.ParentLODError` 取 max；生成的一组 coarse parents 全部复制 `Group.ParentLODError` 和 `Group.LODBounds`。
- `Group.Bounds` 与 `Group.LODBounds` 是不同信息，制作时必须清楚区分空间可见性包围球与投影误差球。
- 当前 Graph Grouping 权重还考虑 sibling 关系及 locality，不能把实际权重写成简单的共享边总数。
- 三角形简化器使用 `ExternalEdges` 与 `LockPosition` 保护外部边界，且平方误差经过 `sqrt` 和缩放还原后才返回。

逐条证据及私有源文件定位：见 [ue-5.8.4-source-review.md](./ue-5.8.4-source-review.md)。

**未核实**：UE 5.8.4 Runtime Shader 中误差投影的精确式、近距与透视修正、层级数据编码；不要将教学用误差公式说成实际 GPU 实现。下一阶段技术审查请从这些问题继续。

## V0.5 决策：第五章末尾加入概念性 Runtime LOD Cut 实验

用户确认用一段**左右联动**的动画回答 Error 的用途：
- 左：Camera 由远至近，局部 coarse → fine，其他 Group 无须随之整体改变；
- 右：**Cluster DAG** 的合法选中集合局部变化；不是 BVH；
- 先显示连续变化的 projected error，跨过**教学**误差阈值后再执行一组离散的 2 coarse → 4 fine 替换；
- 明确 Cut 是符合依赖的 Cluster 选择集合，不能画成随意抽取子集；不要把教学上流畅的高亮/形变解释为运行时顶点插值；
- 第二期改为侧重 GPU 如何高效求出这类选择并完成可见性剔除与 Rasterization，第一期不提前讲 GPU 具体实现。
- 第六章不再声称“所有内容都只发生在 Offline Build”；总结构建数据如何实际参与 Runtime 的概念性选择。

文档变更：`narration.md` 第五章新增演示旁白；`storyboard.md` 第五章由 9 镜头增至 13 镜头，全片 **36 个镜头**；`outline.md` 和 `technical-notes.md` 更新边界与数据要求。仍**不设总时长**，PR 仍为**纯文档**。

待验证：UE 5.8.4 GPU screen-space error、阈值来源与 hierarchy traversal。这段先按教学模型制作，不做特定版本行为的实测主张。
