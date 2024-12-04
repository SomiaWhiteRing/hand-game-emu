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
    const emojis = $(".emoji").toArray();
    const updates = [];

    // 更新网格
    emojis.forEach(el => {
      const emoji = $(el);
      spatialGrid.insert(emoji, emoji.data("x"), emoji.data("y"));
    });

    // 计算更新
    emojis.forEach(el => {
      const emoji = $(el);
      const update = calculateUpdate(emoji, spatialGrid);
      if (update) updates.push(update);
    });

    // 批量应用更新
    updates.forEach(update => {
      update.emoji.css({
        left: update.x,
        top: update.y
      }).data({
        x: update.x,
        y: update.y,
        dx: update.dx,
        dy: update.dy
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
    let collisionOccurred = false;

    // 边界检查
    if (x < padding) {
      x = padding;
      dx = Math.abs(dx);
      collisionOccurred = true;
    }
    if (x + width > gameAreaWidth - padding) {
      x = gameAreaWidth - width - padding;
      dx = -Math.abs(dx);
      collisionOccurred = true;
    }
    if (y < padding) {
      y = padding;
      dy = Math.abs(dy);
      collisionOccurred = true;
    }
    if (y + height > gameAreaHeight - padding) {
      y = gameAreaHeight - height - padding;
      dy = -Math.abs(dy);
      collisionOccurred = true;
    }

    if (!collisionOccurred) {
      const type = emoji.attr("class").split(" ")[1];

      for (let other of nearbyEmojis) {
        if (other[0] === emoji[0]) continue;

        const ox = $(other).data("x");
        const oy = $(other).data("y");
        const distance = Math.sqrt(Math.pow(x - ox, 2) + Math.pow(y - oy, 2));

        if (distance < width * PERFORMANCE.COLLISION_THRESHOLD) {
          const otherType = $(other).attr("class").split(" ")[1];

          if (beats[type] === otherType) {
            counters[otherType]--;
            counters[type]++;
            $(other).removeClass(otherType).addClass(type).text(emojis[type]);
            updateCounters();
            break; // 每帧只处理一次转换
          } else if (beats[type] !== otherType && beats[otherType] !== type) {
            const angle = Math.atan2(y - oy, x - ox);
            dx = Math.cos(angle) * MAX_SPEED * 0.8; // 降低反弹速度
            dy = Math.sin(angle) * MAX_SPEED * 0.8;
            collisionOccurred = true;
            break;
          }
        }
      }
    }

    // 应用移动
    if (!collisionOccurred) {
      x += dx;
      y += dy;
    }

    return { x, y, dx, dy };
  }

  // 在开头的常量定义部分添加
  const GAME_STATE = {
    running: false,
    startTime: null,
    endTime: null,
    animationFrame: null,  // 添加动画帧引用
    lastUpdate: null       // 添加上次更新时间
  };

  const PERFORMANCE = {
    UPDATE_INTERVAL: 16,    // 约60fps
    MIN_FRAME_TIME: 14,    // 最小帧时间
    COLLISION_THRESHOLD: 1.5 // 碰撞检测阈值
  };

  // 添加时间格式化函数
  function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
  }

  // 修改时间更新函数
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

  // 优化更新函数
  function gameLoop(timestamp) {
    if (!GAME_STATE.running) return;

    // 计算帧时间
    if (!GAME_STATE.lastUpdate) GAME_STATE.lastUpdate = timestamp;
    const deltaTime = timestamp - GAME_STATE.lastUpdate;

    // 限制更新频率
    if (deltaTime >= PERFORMANCE.MIN_FRAME_TIME) {
      GAME_STATE.lastUpdate = timestamp;
      updateAllEmojis();
      updateTimer();
      checkGameEnd();
    }

    // 请求下一帧
    GAME_STATE.animationFrame = requestAnimationFrame(gameLoop);
  }

  // 优化 startAnimation 函数
  function startAnimation() {
    if (GAME_STATE.animationFrame) {
      cancelAnimationFrame(GAME_STATE.animationFrame);
    }
    GAME_STATE.running = true;
    GAME_STATE.startTime = Date.now();
    GAME_STATE.endTime = null;
    GAME_STATE.lastUpdate = null;
    GAME_STATE.animationFrame = requestAnimationFrame(gameLoop);
  }

  // 修改 start 按钮点击事件
  $("#start").click(function () {
    if (GAME_STATE.animationFrame) {
      cancelAnimationFrame(GAME_STATE.animationFrame);
    }
    $("#game-area").empty();
    GAME_STATE.running = false;
    GAME_STATE.startTime = null;
    GAME_STATE.endTime = null;
    GAME_STATE.lastUpdate = null;
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

    startAnimation();
  });
});