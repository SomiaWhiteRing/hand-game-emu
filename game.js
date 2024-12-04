$(document).ready(function () {
  // 移动端适配
  function adjustGameArea() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const gameArea = $("#game-area");

    // 设置游戏区域的最大宽度
    const maxWidth = Math.min(800, screenWidth - 20); // 左右留10px边距

    // 修改高度计算逻辑
    // 考虑其他元素占用的空间（输入框、计数器、页脚等）
    const otherElementsHeight = 200; // 预估其他元素总高度
    const availableHeight = screenHeight - otherElementsHeight;

    // 计算合适的高度，保持4:3比例但不超过可用空间
    let finalHeight = Math.min(
      600, // 最大高度限制
      availableHeight, // 可用空间限制
      maxWidth * 0.75, // 宽高比限制
      Math.max(300, screenHeight * 0.5) // 最小高度限制
    );

    // 确保最小高度
    finalHeight = Math.max(finalHeight, 300);

    // 应用尺寸
    gameArea.width(maxWidth);
    gameArea.height(finalHeight);

    // 调整 emoji 大小
    const fontSize = Math.max(12, maxWidth / 40);
    $(".emoji").css("font-size", fontSize + "px");
  }

  // 等待一小段时间确保页面完全加载
  setTimeout(adjustGameArea, 100);

  // 添加 orientationchange 事件监听
  $(window).on('orientationchange', function () {
    setTimeout(adjustGameArea, 100);
  });

  // 保留原有的 resize 监听
  $(window).resize(adjustGameArea);

  var emojis = {
    rock: "🗿",
    scissors: "✂️",
    paper: "🖐️",
  };

  var counters = {
    rock: 0,
    scissors: 0,
    paper: 0,
  };

  var beats = {
    rock: "scissors",
    scissors: "paper",
    paper: "rock"
  };

  var beatenBy = {
    rock: "paper",
    scissors: "rock",
    paper: "scissors"
  };

  const CHASE_FORCE = 0.1;  // 追逐力度
  const FLEE_FORCE = 0.11;   // 逃避力度
  const DETECTION_RADIUS = 100;  // 检测半径
  const MAX_SPEED = 1.5;      // 最大速度限制

  function calculateDistance(x1, y1, x2, y2) {
    return {
      distance: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
      directionX: (x2 - x1),
      directionY: (y2 - y1)
    };
  }

  function updateCounters() {
    $("#rock-count").text("石头: " + counters["rock"]);
    $("#scissors-count").text("剪刀: " + counters["scissors"]);
    $("#paper-count").text("布: " + counters["paper"]);
  }

  // 直接修改 createEmoji 函数的定义
  function createEmoji(type) {
    var emoji = $("<div></div>");
    emoji.addClass("emoji");
    emoji.addClass(type);
    emoji.text(emojis[type]);
    var x = Math.random() * $("#game-area").width();
    var y = Math.random() * $("#game-area").height();
    emoji.css("left", x);
    emoji.css("top", y);
    emoji.data("x", x);
    emoji.data("y", y);
    emoji.data("dx", (Math.random() - 0.5) * 2 + 0.2);
    emoji.data("dy", (Math.random() - 0.5) * 2 + 0.2);

    // 修改这里的字体大小计算
    const fontSize = Math.max(12, $("#game-area").width() / 40);
    emoji.css("font-size", fontSize + "px");

    $("#game-area").append(emoji);
    counters[type]++;
    updateCounters();
    return emoji;
  }

  // 添加一个函数用于计算追逐和逃避行为
  function calculateBehavior(emoji, allEmojis) {
    let type = emoji.attr("class").split(" ")[1];
    let x = emoji.data("x");
    let y = emoji.data("y");
    let totalForceX = 0;
    let totalForceY = 0;

    allEmojis.each(function () {
      let other = $(this);
      if (other[0] !== emoji[0]) {
        let otherType = other.attr("class").split(" ")[1];
        let otherX = other.data("x");
        let otherY = other.data("y");

        let distanceInfo = calculateDistance(x, y, otherX, otherY);

        if (distanceInfo.distance < DETECTION_RADIUS) {
          let normalizedDirX = distanceInfo.directionX / distanceInfo.distance;
          let normalizedDirY = distanceInfo.directionY / distanceInfo.distance;

          // 如果是可以击败的对象，追逐它
          if (beats[type] === otherType) {
            totalForceX += normalizedDirX * CHASE_FORCE;
            totalForceY += normalizedDirY * CHASE_FORCE;
          }
          // 如果是会被击败的对象，逃离它
          if (beatenBy[type] === otherType) {
            totalForceX -= normalizedDirX * FLEE_FORCE;
            totalForceY -= normalizedDirY * FLEE_FORCE;
          }
        }
      }
    });

    return { forceX: totalForceX, forceY: totalForceY };
  }

  // 添加性能优化相关的常量
  const GRID_SIZE = 50; // 网格大小，用于空间分区
  const UPDATE_INTERVAL = 20; // 更新间隔，略微降低更新频率

  // 添加空间分区系统
  class SpatialGrid {
    constructor(width, height, cellSize) {
      this.cellSize = cellSize;
      this.cols = Math.ceil(width / cellSize);
      this.rows = Math.ceil(height / cellSize);
      this.grid = new Array(this.cols * this.rows).fill().map(() => []);
    }

    clear() {
      this.grid.forEach(cell => cell.length = 0);
    }

    getCell(x, y) {
      const col = Math.floor(x / this.cellSize);
      const row = Math.floor(y / this.cellSize);
      if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
      return this.grid[row * this.cols + col];
    }

    insert(emoji, x, y) {
      const cell = this.getCell(x, y);
      if (cell) cell.push(emoji);
    }

    getNearbyEmojis(x, y) {
      const nearby = new Set();
      const col = Math.floor(x / this.cellSize);
      const row = Math.floor(y / this.cellSize);

      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const checkCol = col + i;
          const checkRow = row + j;
          if (checkCol >= 0 && checkCol < this.cols && checkRow >= 0 && checkRow < this.rows) {
            const cell = this.grid[checkRow * this.cols + checkCol];
            cell.forEach(emoji => nearby.add(emoji));
          }
        }
      }
      return Array.from(nearby);
    }
  }

  // 修改 updateAllEmojis 函数
  function updateAllEmojis() {
    const gameArea = $("#game-area");
    const width = gameArea.width();
    const height = gameArea.height();
    const spatialGrid = new SpatialGrid(width, height, GRID_SIZE);

    // 首先更新空间网格
    $(".emoji").each(function () {
      const emoji = $(this);
      spatialGrid.insert(emoji, emoji.data("x"), emoji.data("y"));
    });

    // 批量更新位置
    const updates = [];

    $(".emoji").each(function () {
      const emoji = $(this);
      const update = calculateUpdate(emoji, spatialGrid);
      if (update) {
        updates.push(update);
      }
    });

    // 批量应用更新
    requestAnimationFrame(() => {
      updates.forEach(update => {
        update.emoji.css({
          left: update.x,
          top: update.y
        });
        update.emoji.data({
          x: update.x,
          y: update.y,
          dx: update.dx,
          dy: update.dy
        });
      });
    });
  }

  // 新增计算更新函数
  function calculateUpdate(emoji, spatialGrid) {
    let x = emoji.data("x");
    let y = emoji.data("y");
    let dx = emoji.data("dx");
    let dy = emoji.data("dy");

    // 获取附近的emoji进行碰撞检测
    const nearbyEmojis = spatialGrid.getNearbyEmojis(x, y);

    // 计算行为
    const behavior = calculateBehavior(emoji, $(nearbyEmojis));
    dx += behavior.forceX;
    dy += behavior.forceY;

    // 速度限制
    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed > MAX_SPEED) {
      dx = (dx / speed) * MAX_SPEED;
      dy = (dy / speed) * MAX_SPEED;
    }

    // 边界检查和碰撞处理
    const result = handleCollisions(emoji, x, y, dx, dy, nearbyEmojis);

    return {
      emoji: emoji,
      x: result.x,
      y: result.y,
      dx: result.dx,
      dy: result.dy
    };
  }

  // 新增碰撞处理函数
  function handleCollisions(emoji, x, y, dx, dy, nearbyEmojis) {
    const width = emoji.width();
    const height = emoji.height();
    const gameAreaWidth = $("#game-area").width();
    const gameAreaHeight = $("#game-area").height();
    const padding = 2;

    // 边界检查
    if (x < padding) {
      x = padding;
      dx = Math.abs(dx);
    }
    if (x + width > gameAreaWidth - padding) {
      x = gameAreaWidth - width - padding;
      dx = -Math.abs(dx);
    }
    if (y < padding) {
      y = padding;
      dy = Math.abs(dy);
    }
    if (y + height > gameAreaHeight - padding) {
      y = gameAreaHeight - height - padding;
      dy = -Math.abs(dy);
    }

    // 碰撞检测和处理
    const type = emoji.attr("class").split(" ")[1];

    nearbyEmojis.forEach(other => {
      if (other[0] !== emoji[0]) {
        const ox = other.data("x");
        const oy = other.data("y");
        if (Math.abs(x - ox) < width && Math.abs(y - oy) < height) {
          const otherType = other.attr("class").split(" ")[1];

          if (beats[type] === otherType) {
            // 直接处理转换，不使用 setTimeout
            counters[otherType]--;
            counters[type]++;
            other.removeClass(otherType).addClass(type).text(emojis[type]);
            updateCounters();
          } else if (beats[type] !== otherType && beats[otherType] !== type) {
            // 简化的弹开处理
            const angle = Math.atan2(y - oy, x - ox);
            dx = Math.cos(angle) * MAX_SPEED;
            dy = Math.sin(angle) * MAX_SPEED;
          }
        }
      }
    });

    // 更新位置
    x += dx;
    y += dy;

    return { x, y, dx, dy };
  }

  // 在开头的常量定义部分添加
  const GAME_STATE = {
    running: false
  };

  // 添加游戏结束检查函数
  function checkGameEnd() {
    let winner = null;
    let totalCount = 0;

    for (let type in counters) {
      if (counters[type] > 0) {
        totalCount += counters[type];
        winner = type;
      }
    }

    // 如果只剩一种类型的emoji
    if (totalCount > 0 && totalCount === counters[winner]) {
      GAME_STATE.running = false;

      // 创建结束游戏蒙版
      const overlay = $("<div></div>")
        .css({
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "2em",
          zIndex: 1000
        })
        .text(`${emojis[winner]}获胜！`);

      $("#game-area").append(overlay);
    }
  }

  // 修改 startAnimation 函数
  function startAnimation() {
    GAME_STATE.running = true;
    const animationInterval = setInterval(() => {
      if (!GAME_STATE.running) {
        clearInterval(animationInterval);
        return;
      }
      updateAllEmojis();
      checkGameEnd();
    }, UPDATE_INTERVAL);
  }

  // 修改 start 按钮点击事件
  $("#start").click(function () {
    $("#game-area").empty();
    GAME_STATE.running = false;
    counters = {
      rock: 0,
      scissors: 0,
      paper: 0,
    };
    updateCounters();
    var rockCount = $("#rock").val();
    var scissorsCount = $("#scissors").val();
    var paperCount = $("#paper").val();
    for (var i = 0; i < rockCount; i++) {
      createEmoji("rock");
    }
    for (var i = 0; i < scissorsCount; i++) {
      createEmoji("scissors");
    }
    for (var i = 0; i < paperCount; i++) {
      createEmoji("paper");
    }
    startAnimation();
  });
});