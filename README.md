# 石头剪刀布大战 (Rock Paper Scissors Battle)

一个有趣的石头剪刀布自动对战模拟器。在这个模拟器中，石头、剪刀、布会根据相互克制关系自动追逐或逃避对方。

## 特性

- 🎮 直观的可视化界面
- 🤖 智能的追逐与逃避行为
- 📱 完整的移动端支持
- ⚡ 优化的性能表现

## 游戏规则

- 🗿 石头打败剪刀
- ✂️ 剪刀打败布
- 🖐️ 布打败石头

每个表情符号都会：
- 追逐它能打败的对手
- 逃离能打败它的对手
- 在相遇时根据克制关系转换对方

## 如何使用

1. 在输入框中设置每种表情的初始数量
2. 点击"确定"开始游戏
3. 观察它们的互动过程
4. 等待最后的胜利者出现

## 技术细节

- 使用 jQuery 进行 DOM 操作
- 实现空间分区算法优化碰撞检测
- 使用 requestAnimationFrame 实现流畅动画
- 响应式设计适配各种屏幕尺寸

## 在线体验

[点击这里体验游戏](https://somiawhitering.github.io/hand-game-emu/)

## 开发者

苍旻白轮 (SomiaWhiteRing)

## 许可证

© 2023~2024 苍旻白轮。保留所有权利。 