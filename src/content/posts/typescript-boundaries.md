---
title: "TypeScript：给不确定的数据一个边界"
description: "类型提示之外，重新理解 unknown、类型收窄与运行时校验，让程序的边界更清楚。"
pubDate: "2026-10-18"
tags: ["TypeScript", "工程实践"]
---

> 示例文章：本文用于演示技术文章、代码高亮与站内搜索。

TypeScript 能帮助我们描述程序内部的数据，但外部世界并不会自动遵守这些约定。从接口返回值到本地配置，数据进入程序的地方，都需要一个明确的边界。

## 先承认不知道

`unknown` 表达的是“这里有一个值，但还没有足够信息使用它”。它让我们在访问属性之前，先证明这个值符合预期。

```ts
type Profile = { name: string };

function isProfile(value: unknown): value is Profile {
  return typeof value === 'object'
    && value !== null
    && 'name' in value
    && typeof value.name === 'string';
}

function greet(value: unknown) {
  if (!isProfile(value)) return '你好，访客';
  return `你好，${value.name}`;
}
```

## 在入口完成校验

把运行时校验放在数据进入系统的位置，后续逻辑就可以处理已经可靠的数据。不必在每个组件里重复猜测字段是否存在。

### 让错误可以定位

校验失败时，错误信息应说明哪个字段不符合预期。只有“数据无效”这四个字，通常不足以支持排查。

## 类型服务于沟通

好的类型能解释哪些状态允许出现，也能提醒维护者哪些变化需要一起处理。先把边界画清楚，再考虑更复杂的泛型抽象，往往更容易维护。
