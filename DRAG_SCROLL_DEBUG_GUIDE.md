# 统一排期表拖动页面滚动问题 - 调试指南

## 问题描述
在统一排期表（统一排期管理）中拖动时间块时，页面不应该滚动到顶部。如果发生这种情况，本文档将帮助你诊断和提供反馈。

## 修复说明

### 已实施的优化
1. **CSS Transform 视觉反馈**：拖动时使用 `transform: translateY()` 而不是重新渲染，大幅减少 DOM 重建频率
2. **调试日志系统**：可以启用详细日志来诊断问题
3. **黑名单设置布局修复**：解决了表单元素超出边界的问题
4. **复选框布局优化**：将两个复选框组织为更紧凑的布局

## 启用调试模式

### 步骤1：打开浏览器控制台
- **Chrome/Edge**：按 `F12` 或 `Ctrl+Shift+I`（Windows）/ `Cmd+Option+I`（Mac）
- **Firefox**：按 `F12` 或 `Ctrl+Shift+I`（Windows）/ `Cmd+Option+I`（Mac）

### 步骤2：启用调试日志
在浏览器控制台中输入以下命令：
```javascript
window.DRAG_DEBUG_ENABLED = true;
```

### 步骤3：执行拖动操作
1. 导航到"实验室统一排期表"页面
2. 在日期列中选择一个时间块，并拖动调整其时间
3. 观察控制台输出

## 预期的日志输出

如果正常工作，你应该看到类似的日志序列：

```
[DRAG_CAPTURE] startX: 245, startY: 623, slot.startMin: 540
[SCROLL_BEFORE] window.scrollY: 0, scrollParent: N/A
[DRAG_START] slot: tmp_1234567890_abc, startMin: 540, y: 623
[DRAG_MOVE] step: 10, nextStart: 550, visualTransform: 50px
[DRAG_MOVE] step: 20, nextStart: 560, visualTransform: 100px
[DRAG_END] slot: tmp_1234567890_abc, newStartMin: 560, endMin: 620
[RENDER_COMPLETE] renderFn called at 2026-01-15T10:30:45.123Z
```

## 异常情况诊断

### 情况1：如果页面滚动到顶部
**日志表现**：`window.scrollY` 在 `[RENDER_COMPLETE]` 之后变为非零值

**可能原因**：
- 某个事件监听器在 `renderUnifiedScheduleGrid()` 期间被触发
- 页面其他部分的代码在渲染后调用了 `scrollIntoView()` 或类似方法
- 浏览器焦点自动滚动

**收集信息**：
1. 记录页面滚动到顶部时的 `window.scrollY` 值
2. 检查浏览器控制台中是否有错误信息（红色文本）
3. 查看"Network"标签，检查是否有异常的 API 请求

### 情况2：拖动不流畅
**日志表现**：`[DRAG_MOVE]` 日志间隔不均匀，或缺少某些日志

**可能原因**：
- 浏览器性能问题
- 事件处理不当
- 其他 JavaScript 代码干扰

**收集信息**：
1. 打开浏览器的 Performance 标签
2. 开始录制，拖动时间块，停止录制
3. 查看帧率（应保持 60fps 或接近）
4. 寻找长时间的"黄色"或"红色"块（表示卡顿）

### 情况3：拖动不工作
**日志表现**：根本看不到 `[DRAG_CAPTURE]` 日志

**可能原因**：
- `enableAdminSlotDrag` 函数没有被正确调用
- 时间块元素的事件监听器未正确绑定
- 某个早期错误导致脚本异常

**收集信息**：
1. 检查控制台中是否有 JavaScript 错误
2. 尝试在非前面板的时间块上拖动（验证是否是特定块的问题）
3. 检查浏览器是否支持 JavaScript（某些浏览器扩展可能会阻止）

## 详细问题反馈模板

如果仍然遇到问题，请收集以下信息并反馈：

```
【拖动滚动问题反馈】

操作系统：[Windows 10 / Mac / Linux]
浏览器及版本：[例：Chrome 126.0.6478.185]
实验地点：[例："生命科学院三楼"]

可复现步骤：
1. 
2. 
3. 

问题表现：
- 页面滚动到顶部？[是/否]
- 滚动位置是多少？[例：从300px滚动到0px]
- 拖动是否有延迟？[是/否]
- 拖动后时间块是否正确移动？[是/否]

启用调试后的日志输出：
[粘贴 [DRAG_] 开头的所有日志]

页面滚动后的日志：
[粘贴 [SCROLL_] 开头的所有日志]

浏览器控制台错误：
[是否有红色错误？]
[具体错误信息是什么？]

其他观察：
[任何其他异常现象]
```

## 进阶调试

### 检查 DOM 变化
在拖动时检查 DOM 节点是否被重建：

```javascript
// 在控制台执行
const unifiedScheduleGrid = document.getElementById("unifiedScheduleGrid");
const initialChildCount = unifiedScheduleGrid.children.length;

// 然后拖动时间块...

// 拖动后检查
console.log("Children before:", initialChildCount);
console.log("Children after:", unifiedScheduleGrid.children.length);
console.log("Changed:", initialChildCount !== unifiedScheduleGrid.children.length);
```

规范的行为应该是：
- 拖动过程中（`[DRAG_MOVE]`）：子节点数不变
- 拖动结束（`[RENDER_COMPLETE]`）：子节点数可能变化（重新渲染）

### 检查页面滚动事件
```javascript
let scrollCount = 0;
window.addEventListener("scroll", (e) => {
  scrollCount++;
  console.log(`[SCROLL_EVENT #${scrollCount}]`, {
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    stack: new Error().stack.split('\n')[2]
  });
}, true);
```

然后进行拖动操作，记录任何意外的scroll事件。

## 常见解决方案

### 1. 如果是浏览器缓存问题
- 清除浏览器缓存（`Ctrl+Shift+Delete`）
- 按 `Ctrl+Shift+R` 强制刷新页面

### 2. 如果是浏览器扩展干扰
- 在无痕/隐私模式下测试
- 禁用浏览器扩展后重试

### 3. 如果是其他代码干扰
- 检查浏览器控制台是否有其他脚本错误
- 尝试在不同的浏览器中测试

## 性能指标目标

正常情况下，你应该看到：
- **拖动帧率**：50-60 FPS（稳定）
- **日志间隔**：每次鼠标移动一个 `[DRAG_MOVE]` 日志
- **页面滚动位置**：在拖动过程中保持不变
- **渲染时间**：拖动结束后 `[RENDER_COMPLETE]` 日志应在 100ms 内出现

## 获取帮助

如果以上步骤都无法解决问题，请：
1. 收集上述"问题反馈模板"中的所有信息
2. 记录浏览器控制台的完整输出
3. 如果可能，录制一段屏幕视频展示问题
4. 提供给开发团队

---

**最后更新**：2026-02-27  
**版本**：1.0
