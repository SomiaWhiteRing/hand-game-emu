$(document).ready(function () {
  // 移动端适配
  function adjustGameArea() {
    const gameArea = $("#game-area");
    const screenWidth = document.documentElement.clientWidth || window.innerWidth;

    // 设置宽度
    const maxWidth = Math.min(800, screenWidth - 20);
    gameArea.width(maxWidth);

    // 根据宽度设置高度，保持4:3比例
    const targetHeight = Math.round(maxWidth * 0.75);

    // 设置高度，但不小于300px
    const finalHeight = Math.max(300, targetHeight);
    gameArea.height(finalHeight);

    // 调整 emoji 大小
    const fontSize = Math.max(12, maxWidth / 40);
    $(".emoji").css("font-size", fontSize + "px");
  }

  // 修改初始化时机
  $(document).ready(function () {
    // 立即调整一次
    adjustGameArea();

    // 100ms后再调整一次
    setTimeout(adjustGameArea, 100);

    // 监听窗口大小变化
    $(window).on('resize orientationchange', function () {
      adjustGameArea();
    });
  });

  // 修改 emojis 对象为动态对象
  let emojis = {
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
    const speedScale = GAME_STATE.currentSpeedScale;
    emoji.data("dx", ((Math.random() - 0.5) * 2 + 0.2) * speedScale);
    emoji.data("dy", ((Math.random() - 0.5) * 2 + 0.2) * speedScale);

    // 修改这里的字体大小计算
    const fontSize = Math.max(12, $("#game-area").width() / 40);
    emoji.css("font-size", fontSize + "px");

    $("#game-area").append(emoji);
    counters[type]++;
    updateCounters();
    return emoji;
  }

  // 添加随机性相关的常量
  const RANDOM = {
    DIRECTION_CHANGE: 0.02,  // 随机改变方向的概率
    FORCE_VARIATION: 0.03,   // 力的随机变化幅度
    SPEED_VARIATION: 0.1,    // 速度的随机变化幅度
    MAX_WANDER: 0.3         // 最大随机游走力度
  };

  // 修改 calculateBehavior 函数，添加随机游走行为
  function calculateBehavior(emoji, allEmojis) {
    let type = emoji.attr("class").split(" ")[1];
    let x = emoji.data("x");
    let y = emoji.data("y");
    let totalForceX = 0;
    let totalForceY = 0;

    // 添加随机游走行为
    if (Math.random() < RANDOM.DIRECTION_CHANGE) {
      totalForceX += (Math.random() - 0.5) * RANDOM.MAX_WANDER;
      totalForceY += (Math.random() - 0.5) * RANDOM.MAX_WANDER;
    }

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

          // 添加随机变化到追逐和逃避力度
          const chaseVariation = 1 + (Math.random() - 0.5) * RANDOM.FORCE_VARIATION;
          const fleeVariation = 1 + (Math.random() - 0.5) * RANDOM.FORCE_VARIATION;

          if (beats[type] === otherType) {
            totalForceX += normalizedDirX * CHASE_FORCE * chaseVariation;
            totalForceY += normalizedDirY * CHASE_FORCE * chaseVariation;
          }
          if (beatenBy[type] === otherType) {
            totalForceX -= normalizedDirX * FLEE_FORCE * fleeVariation;
            totalForceY -= normalizedDirY * FLEE_FORCE * fleeVariation;
          }
        }
      }
    });

    return { forceX: totalForceX, forceY: totalForceY };
  }

  // 添加性能优化相关的常量
  const GRID_SIZE = 50; // 网格大小，用于空间分区
  const UPDATE_INTERVAL = 20; // 更新间隔，略微降低更新频率

  // 添加间分区系统
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

  // 添加速度缩放相关的常量
  const SPEED_SCALE = {
    BASE_WIDTH: 355,    // 基准宽度
    BASE_HEIGHT: 300,   // 基准高度
    BASE_FONT: 12,      // 基准字体大小
    MIN_SCALE: 1,       // 最小缩放倍数
    MAX_SCALE: 2.5      // 最大缩放倍数
  };

  // 添加获取速度缩放比例的函数
  function getSpeedScale() {
    const gameArea = $("#game-area");
    const width = gameArea.width();
    const height = gameArea.height();
    const fontSize = Math.max(12, width / 40); // 当前字体大小

    // 计算尺寸比例
    const sizeRatio = Math.sqrt(
      (width * height) / (SPEED_SCALE.BASE_WIDTH * SPEED_SCALE.BASE_HEIGHT)
    );

    // 计算字体比例
    const fontRatio = fontSize / SPEED_SCALE.BASE_FONT;

    // 综合比例
    const scale = Math.min(
      SPEED_SCALE.MAX_SCALE,
      Math.max(
        SPEED_SCALE.MIN_SCALE,
        (sizeRatio + fontRatio) / 2
      )
    );

    return scale;
  }

  // 修改 calculateUpdate 函数
  function calculateUpdate(emoji, spatialGrid) {
    let x = emoji.data("x");
    let y = emoji.data("y");
    let dx = emoji.data("dx");
    let dy = emoji.data("dy");

    // 使用保存的速度倍率
    const speedScale = GAME_STATE.currentSpeedScale;

    // 添加随机速度变化
    dx *= (1 + (Math.random() - 0.5) * RANDOM.SPEED_VARIATION);
    dy *= (1 + (Math.random() - 0.5) * RANDOM.SPEED_VARIATION);

    const nearbyEmojis = spatialGrid.getNearbyEmojis(x, y);
    const behavior = calculateBehavior(emoji, $(nearbyEmojis));

    // 应用缩放到行为力
    dx += behavior.forceX * speedScale;
    dy += behavior.forceY * speedScale;

    // 应用缩放到最大速度限制
    const scaledMaxSpeed = MAX_SPEED * speedScale;
    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed > scaledMaxSpeed) {
      dx = (dx / speed) * scaledMaxSpeed;
      dy = (dy / speed) * scaledMaxSpeed;
    }

    const result = handleCollisions(emoji, x, y, dx, dy, nearbyEmojis, speedScale);

    return {
      emoji: emoji,
      x: result.x,
      y: result.y,
      dx: result.dx,
      dy: result.dy
    };
  }

  // 新增碰撞处理函数
  function handleCollisions(emoji, x, y, dx, dy, nearbyEmojis, speedScale) {
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
            dx = Math.cos(angle) * MAX_SPEED * speedScale;
            dy = Math.sin(angle) * MAX_SPEED * speedScale;
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
    running: false,
    startTime: null,
    endTime: null,
    currentSpeedScale: 1,
    intervalId: null  // 添加 intervalId 来跟踪 setInterval
  };

  // 添加时间格式化函数
  function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
  }

  // 添加时间更新函数
  function updateTimer() {
    if (GAME_STATE.running && GAME_STATE.startTime) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - GAME_STATE.startTime;
      $("#timer").text(`时间: ${formatTime(elapsedTime)}`);
    }
  }

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
      GAME_STATE.endTime = Date.now();

      // 清除定时器
      if (GAME_STATE.intervalId !== null) {
        clearInterval(GAME_STATE.intervalId);
        GAME_STATE.intervalId = null;
      }

      const duration = GAME_STATE.endTime - GAME_STATE.startTime;

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
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "2em",
          zIndex: 1000
        });

      // 添加胜利信息和用时信息
      overlay.append(
        $("<div></div>").text(`${emojis[winner]}获胜！`),
        $("<div></div>").css({
          fontSize: "0.6em",
          marginTop: "10px"
        }).text(`用时：${formatTime(duration)}`)
      );

      $("#game-area").append(overlay);
    }
  }

  // 修改 startAnimation 函数
  function startAnimation() {
    // 清除可能存在的旧定时器
    if (GAME_STATE.intervalId !== null) {
      clearInterval(GAME_STATE.intervalId);
      GAME_STATE.intervalId = null;
    }

    GAME_STATE.running = true;
    GAME_STATE.startTime = Date.now();
    GAME_STATE.endTime = null;

    // 保存新的时器 ID
    GAME_STATE.intervalId = setInterval(() => {
      if (GAME_STATE.running) {
        updateAllEmojis();
        updateTimer();
        checkGameEnd();
      }
    }, 16);
  }

  // 添加自定义警告函数
  function showCustomAlert(message) {
    const alert = $("<div></div>")
      .addClass("custom-alert")
      .text(message);

    $("#alert-container").append(alert);

    // 2秒后自动消失
    setTimeout(() => {
      alert.css("animation", "fadeOut 0.3s ease-out");
      setTimeout(() => alert.remove(), 300);
    }, 2000);
  }

  // 修改开始按钮点击事件
  $("#start").click(function () {
    // 检查所有 emoji 输入是否有效
    const rockEmoji = $("#rock-emoji").val();
    const scissorsEmoji = $("#scissors-emoji").val();
    const paperEmoji = $("#paper-emoji").val();

    // 检查是否所有 emoji 都已输入
    if (!rockEmoji || !scissorsEmoji || !paperEmoji) {
      showCustomAlert("请输入所有表情符号");
      return;
    }

    // 更新 emojis 对象
    emojis = {
      rock: rockEmoji,
      scissors: scissorsEmoji,
      paper: paperEmoji
    };

    // 清空游戏区域
    $("#game-area").empty();
    GAME_STATE.running = false;
    GAME_STATE.startTime = null;
    GAME_STATE.endTime = null;

    // 在游戏开始时计算并保存速度倍率
    GAME_STATE.currentSpeedScale = getSpeedScale();

    counters = {
      rock: 0,
      scissors: 0,
      paper: 0,
    };
    updateCounters();
    $("#timer").text("时间: 00:00:000");

    const rockCount = parseInt($("#rock").val()) || 0;
    const scissorsCount = parseInt($("#scissors").val()) || 0;
    const paperCount = parseInt($("#paper").val()) || 0;

    for (let i = 0; i < rockCount; i++) createEmoji("rock");
    for (let i = 0; i < scissorsCount; i++) createEmoji("scissors");
    for (let i = 0; i < paperCount; i++) createEmoji("paper");

    GAME_STATE.running = true;
    GAME_STATE.startTime = Date.now();
    startAnimation();
  });

  // 添加 updateAllEmojis 函数
  function updateAllEmojis() {
    const gameArea = $("#game-area");
    const width = gameArea.width();
    const height = gameArea.height();
    const spatialGrid = new SpatialGrid(width, height, GRID_SIZE);
    const emojis = $(".emoji");
    const updates = [];

    // 更新网格
    emojis.each(function () {
      const emoji = $(this);
      spatialGrid.insert(emoji, emoji.data("x"), emoji.data("y"));
    });

    // 计算更新
    emojis.each(function () {
      const emoji = $(this);
      const update = calculateUpdate(emoji, spatialGrid);
      if (update) {
        updates.push(update);
      }
    });

    // 批量应用更新
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
  }
});