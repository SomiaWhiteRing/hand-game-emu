$(document).ready(function () {
  const screenWidth = $(window).width();
  const gameAreaWidth = $("#game-area").width();
  if (gameAreaWidth > screenWidth - 16) {
    $("#game-area").width(screenWidth - 16);
  }
  
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

  function updateCounters() {
    $("#rock-count").text("石头: " + counters["rock"]);
    $("#scissors-count").text("剪刀: " + counters["scissors"]);
    $("#paper-count").text("布: " + counters["paper"]);
  }

  // 在创建emoji时添加速度属性
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
    emoji.data("dx", (Math.random() - 0.5) * 10 + 1); // 修改初始速度
    emoji.data("dy", (Math.random() - 0.5) * 10 + 1); // 修改初始速度
    $("#game-area").append(emoji);
    counters[type]++;
    updateCounters();
  }

  // 添加一个函数来更新emoji的位置和速度
  function updateEmoji(emoji) {
    var x = emoji.data("x");
    var y = emoji.data("y");
    var dx = emoji.data("dx");
    var dy = emoji.data("dy");
    var width = emoji.width();
    var height = emoji.height();

    var gameAreaWidth = $("#game-area").width();
    var gameAreaHeight = $("#game-area").height();

    // 检查边界碰撞
    if (x < 0 || x + width > gameAreaWidth) {
      dx = -dx;
      if (x < 0) {
        x = 0;
      }
      if (x + width > gameAreaWidth) {
        x = gameAreaWidth - width;
      }
    }
    if (y < 0 || y + height > gameAreaHeight) {
      dy = -dy;
      if (y < 0) {
        y = 0;
      }
      if (y + height > gameAreaHeight) {
        y = gameAreaHeight - height;
      }
    }

    // 检查与其他emoji的碰撞
    $(".emoji").each(function () {
      var other = $(this);
      if (other[0] !== emoji[0]) {
        var ox = other.data("x");
        var oy = other.data("y");
        var ow = other.width();
        var oh = other.height();
        if (x < ox + ow && x + width > ox && y < oy + oh && y + height > oy) {
          // 碰撞检测
          var temp = dx;
          dx = other.data("dx");
          other.data("dx", temp);
          temp = dy;
          dy = other.data("dy");
          other.data("dy", temp);

          // 弹开碰撞的emoji
          var distance = Math.sqrt(Math.pow(x - ox, 2) + Math.pow(y - oy, 2));
          var pushForce = 10;
          var pushDirectionX = (x - ox) / distance;
          var pushDirectionY = (y - oy) / distance;
          x += pushForce * pushDirectionX;
          y += pushForce * pushDirectionY;
          emoji.css("left", x);
          emoji.css("top", y);
          emoji.data("x", x);
          emoji.data("y", y);

          // 检查"石头剪刀布"规则
          var type = emoji.attr("class").split(" ")[1];
          var otherType = other.attr("class").split(" ")[1];
          if (
            (type === "rock" && otherType === "scissors") ||
            (type === "scissors" && otherType === "paper") ||
            (type === "paper" && otherType === "rock")
          ) {
            counters[otherType]--;
            counters[type]++;
            other.removeClass(otherType);
            other.addClass(type);
            other.text(emojis[type]);
            updateCounters();
          }
        }
      }
    });

    // 更新位置和速度
    x += dx;
    y += dy;
    emoji.css("left", x);
    emoji.css("top", y);
    emoji.data("x", x);
    emoji.data("y", y);
    emoji.data("dx", dx);
    emoji.data("dy", dy);
  }

  // 添加一个函数来更新所有emoji的位置和速度
  function updateAllEmojis() {
    $(".emoji").each(function () {
      updateEmoji($(this));
    });
  }

    // 添加一个函数来启动动画
  function startAnimation() {
    setInterval(updateAllEmojis, 16);
  }

  startAnimation();

  $("#start").click(function () {
    $("#game-area").empty();
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
  });
});