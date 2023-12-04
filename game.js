$(document).ready(() => {
  const screenWidth = $(window).width();
  const gameAreaWidth = $("#game-area").width();
  if (gameAreaWidth > screenWidth - 16) {
    $("#game-area").width(screenWidth - 16);
  }

  const emojis = {
    rock: "🗿",
    scissors: "✂️",
    paper: "🖐️",
  };

  let counters = {
    rock: 0,
    scissors: 0,
    paper: 0,
  };

  const updateCounters = () => {
    $("#rock-count").text(`石头: ${counters["rock"]}`);
    $("#scissors-count").text(`剪刀: ${counters["scissors"]}`);
    $("#paper-count").text(`布: ${counters["paper"]}`);
  };

  const createEmoji = (type) => {
    const emoji = $("<div></div>")
      .addClass("emoji")
      .addClass(type)
      .text(emojis[type]);
    const x = Math.random() * $("#game-area").width();
    const y = Math.random() * $("#game-area").height();
    emoji.css("left", x);
    emoji.css("top", y);
    emoji.data("x", x);
    emoji.data("y", y);
    emoji.data("dx", (Math.random() - 0.5) * 5 + 1);
    emoji.data("dy", (Math.random() - 0.5) * 5 + 1);
    $("#game-area").append(emoji);
    counters[type]++;
    updateCounters();
  };

  const updateEmoji = (emoji) => {
    let { x, y, dx, dy } = emoji.data();
    const width = emoji.width();
    const height = emoji.height();
    const gameAreaWidth = $("#game-area").width();
    const gameAreaHeight = $("#game-area").height();

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

    $(".emoji").each(function () {
      const other = $(this);
      if (other[0] !== emoji[0]) {
        const { x: ox, y: oy, width: ow, height: oh } = other.data();
        if (x < ox + ow && x + width > ox && y < oy + oh && y + height > oy) {
          const temp = dx;
          dx = other.data("dx");
          other.data("dx", temp);
          temp = dy;
          dy = other.data("dy");
          other.data("dy", temp);

          const distance = Math.sqrt(Math.pow(x - ox, 2) + Math.pow(y - oy, 2));
          const pushForce = 10;
          const pushDirectionX = (x - ox) / distance;
          const pushDirectionY = (y - oy) / distance;
          x += pushForce * pushDirectionX;
          y += pushForce * pushDirectionY;
          emoji.css("left", x);
          emoji.css("top", y);
          emoji.data("x", x);
          emoji.data("y", y);

          const type = emoji.attr("class").split(" ")[1];
          const otherType = other.attr("class").split(" ")[1];
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

    x += dx;
    y += dy;
    emoji.css("left", x);
    emoji.css("top", y);
    emoji.data("x", x);
    emoji.data("y", y);
    emoji.data("dx", dx);
    emoji.data("dy", dy);
  };

  const updateAllEmojis = () => {
    $(".emoji").each(function () {
      updateEmoji($(this));
    });
  };

  const startAnimation = () => {
    setInterval(updateAllEmojis, 16);
  };

  startAnimation();

  $("#start").click(() => {
    $("#game-area").empty();
    counters = {
      rock: 0,
      scissors: 0,
      paper: 0,
    };
    updateCounters();
    const rockCount = $("#rock").val();
    const scissorsCount = $("#scissors").val();
    const paperCount = $("#paper").val();
    for (let i = 0; i < rockCount; i++) {
      createEmoji("rock");
    }
    for (let i = 0; i < scissorsCount; i++) {
      createEmoji("scissors");
    }
    for (let i = 0; i < paperCount; i++) {
      createEmoji("paper");
    }
  });
});
