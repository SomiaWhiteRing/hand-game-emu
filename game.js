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

  // 技能相关配置
  const SKILL_CONFIG = {
    CHECK_INTERVAL: 900,    // 每隔多久检查一次是否触发技能（毫秒）
    TRIGGER_CHANCE: 0.28,   // 每次检查触发技能的概率
    MAX_TARGETS: 10         // 单次技能最多作用的目标数
  };

  // 各技能可调参数（方便平衡用）
  const SKILL_ROCK = {
    DURATION: 5000,         // 地震持续时间（毫秒）
    PUSH_FORCE: 2.2,        // 地震初次冲击的弹飞力度
    RADIUS_RATIO: 0.30      // 地震技能范围相对于对战窗口较短边的比例
  };

  const SKILL_SCISSOR = {
    RADIUS_RATIO: 0.20,     // 冰霜斩击判定半径占较短边的比例
    DURATION: 1500,         // 冰霜斩击持续时间（毫秒）
    LOCK_DURATION: 1000,    // 被锁定单位的冻结时间
    LOCK_MID_TIME: 500     // 渐变中点（用于切换表情）
  };

  const SKILL_PAPER = {
    BASE_SPAWN: 8,          // 召唤结界默认召唤数量上限
    SUMMON_INTERVAL: 100,   // 每个召唤之间的时间间隔（毫秒）
    RELEASE_DELAY: 100      // 所有召唤完成后，恢复碰撞的额外延迟
  };

  let lastSkillCheckTime = 0;
  let summonIdCounter = 0;
  let scissorZones = [];

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

  // 基于对战窗口尺寸计算一个基础长度（较短边）
  function getBattleShortSide() {
    const gameArea = $("#game-area");
    const w = gameArea.width();
    const h = gameArea.height();
    return Math.max(1, Math.min(w, h));
  }

  // 计算地震等大范围技能的半径
  function getRockEffectRadius() {
    return getBattleShortSide() * SKILL_ROCK.RADIUS_RATIO;
  }

  // 计算冰霜斩击的判定半径
  function getScissorRadius() {
    return getBattleShortSide() * SKILL_SCISSOR.RADIUS_RATIO;
  }

  function updateCounters() {
    $("#rock-count").text("石头: " + counters["rock"]);
    $("#scissors-count").text("剪刀: " + counters["scissors"]);
    $("#paper-count").text("布: " + counters["paper"]);
  }

  // 在 emoji 上方显示技能文字
  function showSkillText(emoji, text) {
    const gameArea = $("#game-area");
    const offset = emoji.position();
    const textEl = $("<div></div>")
      .addClass("skill-text")
      .text(text)
      .css({
        left: offset.left + emoji.outerWidth() / 2,
        top: offset.top
      });

    gameArea.append(textEl);

    setTimeout(() => {
      textEl.remove();
    }, 900);
  }

  // 在施法者位置画一个简单的“冲击波”圆圈
  function showSkillWave(emoji, radius) {
    const gameArea = $("#game-area");
    const offset = emoji.position();
    const wave = $("<div></div>")
      .addClass("skill-wave")
      .css({
        left: offset.left + emoji.outerWidth() / 2,
        top: offset.top + emoji.outerHeight() / 2,
        width: radius * 2,
        height: radius * 2
      });

    gameArea.append(wave);

    setTimeout(() => {
      wave.remove();
    }, 550);
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

    // 地震中的石头：不再参与追逐 / 逃跑逻辑，只保留轻微随机游走
    const quakeUntil = emoji.data("quakeUntil") || 0;
    const now = Date.now();
    const ignoreRPS = type === "rock" && quakeUntil && now < quakeUntil;

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

          if (!ignoreRPS) {
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
    const now = Date.now();

    // 统一读取技能冻结 / 碰撞状态
    const freezeUntil = emoji.data("freezeUntil") || 0;
    const noCollision = !!emoji.data("noCollision");
    const quakeUntil = emoji.data("quakeUntil") || 0;

    let x = emoji.data("x");
    let y = emoji.data("y");
    let dx = emoji.data("dx");
    let dy = emoji.data("dy");

    // 在任何行为运算前，先检查是否踏入了冰霜斩击的范围
    if (!emoji.data("scissorLock")) {
      checkScissorZones(emoji, now);
    }

    // 使用保存的速度倍率
    const speedScale = GAME_STATE.currentSpeedScale;

    let result;

    // 若处于技能冻结阶段：位置保持不动、不参与碰撞，只保留自身轻微视觉抖动（如果有）
    if (freezeUntil && now < freezeUntil) {
      result = { x, y, dx: 0, dy: 0 };
    } else {
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

      result = handleCollisions(emoji, x, y, dx, dy, spatialGrid.getNearbyEmojis(x, y), speedScale, noCollision, quakeUntil, now);
    }

    return {
      emoji: emoji,
      x: result.x,
      y: result.y,
      dx: result.dx,
      dy: result.dy
    };
  }

  // 新增碰撞处理函数
  function handleCollisions(emoji, x, y, dx, dy, nearbyEmojis, speedScale, noCollision, quakeUntil, now) {
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
        const otherType = other.attr("class").split(" ")[1];

        // 任何一方处于“无碰撞”状态时忽略碰撞
        if (noCollision || other.data("noCollision")) return;

        // 任意一方是处于地震状态的石头，启用地震专属规则
        const thisIsQuakingRock = (type === "rock") && quakeUntil && now < quakeUntil;
        const otherQuakeUntil = other.data("quakeUntil") || 0;
        const otherIsQuakingRock = (otherType === "rock") && otherQuakeUntil && now < otherQuakeUntil;

        if (thisIsQuakingRock || otherIsQuakingRock) {
          const rockEmoji = thisIsQuakingRock ? emoji : other;
          const otherEmoji = thisIsQuakingRock ? other : emoji;
          const otherEmojiType = otherEmoji.attr("class").split(" ")[1];

          const rx = rockEmoji.data("x");
          const ry = rockEmoji.data("y");
          const ox = otherEmoji.data("x");
          const oy = otherEmoji.data("y");

          // 地震石头不会被任何单位弹走，只影响对方
          if (Math.abs(x - ox) < width && Math.abs(y - oy) < height) {
            if (otherEmojiType !== "rock") {
              // 被撞到的任何非石头单位统统石化
              if (otherEmojiType === "paper") counters["paper"]--;
              if (otherEmojiType === "scissors") counters["scissors"]--;
              counters["rock"]++;
              otherEmoji.removeClass("paper scissors").addClass("rock").text(emojis["rock"]);
              updateCounters();
            }
          }
          // 不再执行常规碰撞逻辑
          return;
        }
        const ox = other.data("x");
        const oy = other.data("y");
        if (Math.abs(x - ox) < width && Math.abs(y - oy) < height) {
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

  // 检查是否踏入了任何冰霜斩击范围
  function checkScissorZones(emoji, now) {
    if (scissorZones.length === 0) return;
    if (emoji.data("scissorLock")) return;

    const type = emoji.attr("class").split(" ")[1];
    if (type === "scissors") return; // 已经是剪刀的不变

    // 地震中的石头不受冰霜斩击影响
    const quakeUntil = emoji.data("quakeUntil") || 0;
    if (type === "rock" && quakeUntil && now < quakeUntil) return;

    const ex = emoji.data("x");
    const ey = emoji.data("y");

    for (let i = 0; i < scissorZones.length; i++) {
      const zone = scissorZones[i];
      if (now > zone.endTime) continue;
    const dx = ex - zone.cx;
    const dy = ey - zone.cy;
    if (dx * dx + dy * dy <= zone.radius * zone.radius) {
      applyScissorLock(emoji, now);
      break;
      }
    }
  }

  // 将任意单位锁定在冰霜斩击范围内并在结束时变成剪刀
  function applyScissorLock(e, now) {
    if (e.data("scissorLock")) return;

    const currentType = e.attr("class").split(" ")[1];
    if (!currentType) return;
    if (currentType === "scissors") return;

    // 地震中的石头不受冰霜斩击影响
    const quakeUntil = e.data("quakeUntil") || 0;
    if (currentType === "rock" && quakeUntil && now < quakeUntil) return;

    const targetFreeze = now + SKILL_SCISSOR.LOCK_DURATION;
    const existFreeze = e.data("freezeUntil") || 0;

    e.data("freezeUntil", Math.max(targetFreeze, existFreeze));
    e.data("noCollision", true);
    e.data("scissorLock", true);
    e.data("scissorOriginalType", currentType);
    e.addClass("morph-lock");

    // 中点时在完全透明状态下换成剪刀表情
    setTimeout(() => {
      if (!e.closest("body").length) return;
      if (!e.data("scissorLock")) return;
      e.text(emojis["scissors"]);
    }, SKILL_SCISSOR.LOCK_MID_TIME);

    // 结束时恢复碰撞与移动，并真正完成类型转换
    setTimeout(() => {
      if (!e.closest("body").length) return;

      const origType = e.data("scissorOriginalType");
      e.removeClass("morph-lock");
      e.data("scissorLock", false);
      e.data("scissorOriginalType", null);

      // 如果没有其他技能再延长冻结，则解除冻结与无碰撞状态
      const freezeUntil = e.data("freezeUntil") || 0;
      if (freezeUntil <= Date.now()) {
        e.data("freezeUntil", 0);
        e.data("noCollision", false);
      }

      const currentClassType = e.attr("class").split(" ")[1];
      if (!origType || currentClassType !== origType) return;

      // 计数从原类型转到剪刀
      if (origType === "rock") counters["rock"]--;
      if (origType === "paper") counters["paper"]--;
      counters["scissors"]++;

      e.removeClass(origType).addClass("scissors");
      updateCounters();
    }, SKILL_SCISSOR.LOCK_DURATION);
  }

  // 技能效果：根据类型发动不同的“群体技”
  function triggerSkillNow(caster) {
    if (!caster || caster.length === 0) return;

    const casterType = caster.attr("class").split(" ")[1];
    const cx = caster.data("x");
    const cy = caster.data("y");

    // 按技能类型动态计算技能范围（与对战窗口尺寸成比例）
    const effectRadius = (casterType === "scissors")
      ? getScissorRadius()
      : getRockEffectRadius();

    const all = $(".emoji");
    const candidates = [];

    all.each(function () {
      const e = $(this);
      if (e[0] === caster[0]) return;
      const ex = e.data("x");
      const ey = e.data("y");
      const d = calculateDistance(cx, cy, ex, ey).distance;
      if (d <= effectRadius) {
        candidates.push({ e, d });
      }
    });

    // 按距离从近到远排序，优先作用附近单位
    candidates.sort((a, b) => a.d - b.d);

    let affected = 0;

    // 通用：给施法者加一圈冲击波、放大效果，同时让战场轻微抖动
    caster.addClass("skill-caster");
    showSkillWave(caster, effectRadius);
    setTimeout(() => caster.removeClass("skill-caster"), 450);

    const gameArea = $("#game-area");
    gameArea.addClass("skill-shake");
    setTimeout(() => gameArea.removeClass("skill-shake"), 280);

    // 石头：地震 - 缠绕光圈一段时间，光圈与碰撞中的一切非石头单位都会被石化
    if (casterType === "rock") {
      showSkillText(caster, "地震！");

      // 在石头周围挂一个旋转光圈
      const orbit = $("<div></div>").addClass("rock-orbit-ring");
      caster.append(orbit);
      setTimeout(() => orbit.remove(), 2000);

      // 在一定时间内标记为“地震状态”的石头
      const now = Date.now();
      caster.data("quakeUntil", now + SKILL_ROCK.DURATION);

      // 初次发动时，对范围内所有非石头单位立即产生一次石化冲击
      candidates.forEach(({ e, d }) => {
        if (affected >= SKILL_CONFIG.MAX_TARGETS) return;
        const targetType = e.attr("class").split(" ")[1];
        if (targetType === "rock") return;

        const ex = e.data("x");
        const ey = e.data("y");
        const dir = calculateDistance(cx, cy, ex, ey);
        if (dir.distance === 0) return;
        const push = SKILL_ROCK.PUSH_FORCE;
        const ndx = (ex - cx) / dir.distance * push * GAME_STATE.currentSpeedScale;
        const ndy = (ey - cy) / dir.distance * push * GAME_STATE.currentSpeedScale;

        e.data("dx", ndx);
        e.data("dy", ndy);

        if (targetType === "paper") counters["paper"]--;
        if (targetType === "scissors") counters["scissors"]--;
        counters["rock"]++;
        e.removeClass("paper scissors").addClass("rock").text(emojis["rock"]);
        e.addClass("skill-hit");
        setTimeout(() => e.removeClass("skill-hit"), 380);
        affected++;
      });
      if (affected > 0) {
        updateCounters();
      }
      return;
    }

    // 剪刀：冰霜斩击 - 固定范围的圆形高亮区域，圆内踏入的单位会被锁定并渐变为剪刀
      if (casterType === "scissors") {
        showSkillText(caster, "冰霜斩击！");

        // 使用与窗口尺寸成比例的判定半径和持续时间
        const SCISSOR_RADIUS = getScissorRadius();
      const areaHighlight = $("<div></div>").addClass("scissor-area");
      const offset = caster.position();
      areaHighlight.css({
        left: offset.left + caster.outerWidth() / 2,
        top: offset.top + caster.outerHeight() / 2,
        width: SCISSOR_RADIUS * 2,
        height: SCISSOR_RADIUS * 2
      });
      $("#game-area").append(areaHighlight);
      setTimeout(() => areaHighlight.remove(), SKILL_SCISSOR.DURATION);
      
      // 记录一个持续一段时间的判定区域，计算更新时会自动把踏入该区域的单位锁定
      const zoneNow = Date.now();
      const zone = {
        cx,
        cy,
        radius: SCISSOR_RADIUS,
        endTime: zoneNow + SKILL_SCISSOR.DURATION
      };
      scissorZones.push(zone);
      return;
    }

    // 布：召唤结界 - 布反色并暂时脱离碰撞，按顺序从本体飞出新的布
    if (casterType === "paper") {
      showSkillText(caster, "召唤结界！");
      const spawnCount = Math.min(SKILL_PAPER.BASE_SPAWN, SKILL_CONFIG.MAX_TARGETS);
      const groupId = ++summonIdCounter;
      const summoned = [];

      // 施法者自身反色并暂时脱离碰撞
      caster.addClass("paper-summon");
      caster.data("noCollision", true);

      const baseAngle = Math.random() * Math.PI * 2;

      for (let i = 0; i < spawnCount; i++) {
        ((index) => {
          setTimeout(() => {
            if (!caster.closest("body").length) return;
            const spawned = createEmoji("paper");
            spawned.addClass("paper-summon");
            spawned.data("noCollision", true);
            spawned.data("summonGroup", groupId);
            summoned.push(spawned);

            // 初始位置在施法者正中心
            const startX = cx;
            const startY = cy;
            spawned.css({ left: startX, top: startY });
            spawned.data("x", startX);
            spawned.data("y", startY);

            // 让召唤出来的布从本体飞出：沿不同方向抛射
            const angle = baseAngle + (index * (Math.PI * 2 / spawnCount));
            const speed = 1.6 * GAME_STATE.currentSpeedScale;
            spawned.data("dx", Math.cos(angle) * speed);
            spawned.data("dy", Math.sin(angle) * speed);
          }, index * SKILL_PAPER.SUMMON_INTERVAL);
        })(i);
      }

      // 所有召唤完成后，恢复碰撞与正常行为
      setTimeout(() => {
        if (caster.closest("body").length) {
          caster.removeClass("paper-summon");
          caster.data("noCollision", false);
        }
        summoned.forEach(s => {
          if (!s.closest("body").length) return;
          s.removeClass("paper-summon");
          s.data("noCollision", false);
        });
      }, spawnCount * SKILL_PAPER.SUMMON_INTERVAL + SKILL_PAPER.RELEASE_DELAY);
    }
  }

  // 每一帧按时间节奏尝试触发一次技能
  function maybeTriggerRandomSkill() {
    const now = Date.now();
    if (now - lastSkillCheckTime < SKILL_CONFIG.CHECK_INTERVAL) {
      return;
    }
    lastSkillCheckTime = now;

    if (Math.random() > SKILL_CONFIG.TRIGGER_CHANCE) {
      return;
    }

    const all = $(".emoji");
    if (all.length === 0) return;

    // 统计当前存活数量，并找出数量最少的阵营
    const liveCounts = {
      rock: counters.rock || 0,
      scissors: counters.scissors || 0,
      paper: counters.paper || 0
    };

    let minCount = Infinity;
    const candidateTypes = [];
    Object.keys(liveCounts).forEach(type => {
      const count = liveCounts[type];
      if (count > 0) {
        if (count < minCount) {
          minCount = count;
          candidateTypes.length = 0;
          candidateTypes.push(type);
        } else if (count === minCount) {
          candidateTypes.push(type);
        }
      }
    });

    // 如果所有类型计数都为 0（理论上不会发生），退回到完全随机
    if (candidateTypes.length === 0) {
      const index = Math.floor(Math.random() * all.length);
      triggerSkillNow($(all.get(index)));
      return;
    }

    // 在数量最少的阵营中选一个具体单位作为施法者
    const preferredType = candidateTypes[Math.floor(Math.random() * candidateTypes.length)];
    const preferredEmojis = all.filter(`.${preferredType}`);

    if (preferredEmojis.length > 0) {
      const idx = Math.floor(Math.random() * preferredEmojis.length);
      const caster = $(preferredEmojis.get(idx));
      triggerSkillNow(caster);
      return;
    }

    // 兜底：如果因为某种原因没找到匹配，仍然从全部单位中随机挑一个
    const fallbackIndex = Math.floor(Math.random() * all.length);
    const caster = $(all.get(fallbackIndex));
    triggerSkillNow(caster);
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
        maybeTriggerRandomSkill();
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
