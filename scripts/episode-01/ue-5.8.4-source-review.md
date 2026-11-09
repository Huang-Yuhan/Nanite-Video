# Episode 01 · UE 5.8.4 Nanite Builder 源码核对

> 审查时间：2026-11-09。来源：用户已同步的私有 fork `Huang-Yuhan/UnrealEngine`，`release` 分支；`Engine/Build/Build.version` 显示 `MajorVersion=5, MinorVersion=8, PatchVersion=4`。
>
> **注意版本与路径**：本次 fork 上负责这部分构建的是 `Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.cpp` / `ClusterDAG.h`，不是 `DagBuilder.cpp`。以下每条实现说明都基于实际读取到的 UE 5.8.4 代码，不是从 5.6.1 推测。后续 fork 更新时仍需重核对。

## 证据索引

| 断言 | 5.8.4 实际位置 | 审稿结论 |
| --- | --- | --- |
| 版本已切换到 5.8.4 | [Build.version](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Build/Build.version) | 已确认 |
| `FClusterDAG::ReduceGroup` 是 Group 简化入口 | [ClusterDAG.cpp L1378–L1606](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.cpp#L1378-L1606) | 已确认 |
| 汇总各 child `LODBounds`、`LODError`；实例化 child 先处理变换与最大尺度 | [ClusterDAG.cpp L1395–L1448](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.cpp#L1395-L1448) | 已确认 |
| `Group.Bounds` 与 `Group.LODBounds` 分别由 child `SphereBounds` / `LODBounds` 汇总 | [ClusterDAG.cpp L1439–L1448](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.cpp#L1439-L1448) | 已确认，是不同语义的球 |
| 本次简化结果 `SimplifyError` 与 child `LODError` 求 Max 得到 `Group.ParentLODError` | [ClusterDAG.cpp L1587](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.cpp#L1587) | 已确认，不是把每轮 QEM cost 累加 |
| 这轮生成的 **coarse parents** 具有相同 `LODBounds` / `LODError`，并指向 `GeneratingGroupIndex` | [ClusterDAG.cpp L1589–L1596](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.cpp#L1589-L1596) | 已确认。**不是说所有原始 fine children 自身的 Error/Bounds 都相同** |
| 顶点边界的锁定依据 `ExternalEdges`，调用 `Simplifier.LockPosition` | [Cluster.cpp L1023–L1045](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/Cluster.cpp#L1023-L1045) | 已确认 |
| 简化调用返回平方误差，随后 `sqrt` 并还原位置缩放 | [Cluster.cpp L1047–L1107](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/Cluster.cpp#L1047-L1107) | 已确认；不能直接把平方 error 当像素 |
| 分组 Graph 边权依赖共享边数量，同时区分 siblings 并加常数权重 | [ClusterDAG.cpp L800–L820](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.cpp#L800-L820) | 已确认；实际不只是简单的原始 shared-edge count |
| `FCluster::ClusterSize = 128` | [Cluster.h L269](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/Cluster.h#L269) | 已确认当前版本 Triangle Cluster 目标常量 |
| `FClusterGroup` 包含 `Bounds`、`LODBounds`、`ParentLODError`、`Children` | [ClusterDAG.h L33–L49](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.h#L33-L49) | 已确认；5.8.4 的字段不同于 5.6.1 的 `MinLODError` /`MaxParentLODError` |
| `FCluster` 持有 `LODError`、`LODBounds`、`SphereBounds`、`GeneratingGroupIndex` | [Cluster.h L307–L324](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/Cluster.h#L307-L324) | 已确认 |
| `FClusterDAG::FindCut` 中包含按误差展开的 Group 访问 | [ClusterDAG.cpp L1614–L1748](https://github.com/Huang-Yuhan/UnrealEngine/blob/release/Engine/Source/Developer/NaniteBuilder/Private/ClusterDAG.cpp#L1614-L1748) | 已确认存在 Offline FindCut；不可把该 CPU/构建期算法直接称为 Runtime GPU Cut |

## 正确的构建逻辑（5.8.4 Triangle Path）

1. 当前 Group 的 `Children` 是 `FClusterRef` 列表。对每个 child，取其 `SphereBounds`、`LODBounds`、`LODError`；若 child 是实例引用，在当前空间应用 Transform，误差和球半径按照最大缩放因子进行保守放大。
2. `Group.Bounds` 由几何 `SphereBounds` 汇总；**`Group.LODBounds` 由误差投影球 `LODBounds` 汇总**。后者不是新 coarse Cluster 自身几何的紧包围球。
3. 合并 Group children 并进行 `SimplifyTriangles`（若走普通三角形路径）；简化器通过 `ExternalEdges` 锁定边界位置，并返回重标定后的 `SimplifyError`。
4. `Group.ParentLODError = max(最大 child LODError, SimplifyError)`，即该层不比任何 child 误差更低。**这里的 max 是 5.8.4 代码直接可见的关系，不是累加。**
5. 对本轮重新 Split 得到的所有 `Parent` Clusters，分别赋值相同的 `Group.LODBounds` 与 `Group.ParentLODError`；关联 `GeneratingGroupIndex`。
6. 因此同一轮 coarse 代替集合的 LOD 数据一致，原先的各个 fine child 可以仍然拥有不同的 `LODError` / `LODBounds`。如果在视频中画「四个 fine 全部变成同一个小误差球」就是错误的。

### 视频中建议展示的简化伪代码

```cpp
// Error projection spheres of the *fine children*
Group.LODBounds = Union(Children_LODBounds);
Group.ParentLODError = Max(ChildLODErrors);

// Error of this simplification step
Group.ParentLODError = Max(Group.ParentLODError, SimplifyError);

// Every coarse cluster generated from this Group shares LOD data
for (auto& Parent : GeneratedCoarseClusters)
{
    Parent.LODBounds = Group.LODBounds;
    Parent.LODError = Group.ParentLODError;
}
```

该段是**教学伪代码**而不是 UE 原函数的逐字摘录；如制作时要截 C++ 真实片段，以对应文件与行号为准。

## 与已写脚本相比的实质修订

- **第五章**：“同一 Group 的成员保存相同误差和球”的措辞必须限定对象：`Group` 汇总 fine child，**生成的 coarse parent siblings** 保存一致的 LOD Error 与 LOD Bounds。
- **第五章**：先演示 child 独立的 `LODBounds`，再演示 Group 的 union `LODBounds` 和生成 coarse 的共享数据；必须清楚区分 `SphereBounds`（几何）与 `LODBounds`（误差）。
- **第五章**：将累计误差的动画改为孩子误差与本轮 `SimplifyError` 的 `max`；不要画线性求和的 Error。
- **第三章**：Group partition 的共享边权重并非严格为 `NumSharedEdges`，源码区分 siblings 并叠加权重；可继续讲「共享边越多，通常越希望分到同组」的直觉。
- **第一期范围**：5.8.4 增加了 Curve、Voxel/ShapePreservation、Assembly 相关分支。第一期先讲**Triangle Cluster 的主路径**，不把其余分支当作不存在。

## 尚未完成的验证

- Runtime GPU Hierarchy traversal、screen-space error 具体投影公式、近距/球内部处理、非均匀实例变换、BVH 编码/数据访问。这些需要另外阅读 5.8.4 的 Runtime shader、Encode/Hierarchy 构建代码。
- 基于 `LODBounds` 和 `LODError` 的最简数学模型可给出保守单调性的直觉证明，但**实际 GPU 公式是否满足每种修正条件，不能仅从这里的 Build 代码保证**。
- UE 5.8.4 没有必要把每个细节都塞进第一期：本轮只验证会影响第五章叙事的 Builder 部分。

## 制作建议

第五章用 3D Sphere & Mesh → Group 合并 → coarse parents 共享 `LODBounds` / `LODError` → 屏幕投影阈值的连续镜头。可用两处极短的 C++ 原码截取强调设计，而不要出现一整屏函数：

- `Group.LODBounds` 聚合的赋值；
- coarse parents 共享 Group 数据的赋值。

这样既有引擎源码深度，又不会损害动画叙事。
