/**
 * Token Radar for Foundry VTT
 * Complete working version with range rings
 */

class RadarSettingsConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Token Radar Settings",
      id: "token-radar-settings",
      template: "modules/token-radar/templates/settings.html",
      width: 600,
      height: "auto"
    });
  }

  getData() {
    // Ensure settings exist before accessing them
    const settings = [
      { name: "hostileColor", value: game.settings.get("token-radar", "hostileColor") },
      { name: "neutralColor", value: game.settings.get("token-radar", "neutralColor") },
      { name: "friendlyColor", value: game.settings.get("token-radar", "friendlyColor") },
      { name: "selfColor", value: game.settings.get("token-radar", "selfColor") },
      { name: "backgroundGradient", value: game.settings.get("token-radar", "backgroundGradient") },
      { name: "maxDistance", value: game.settings.get("token-radar", "maxDistance") },
      { name: "showRangeRings", value: game.settings.get("token-radar", "showRangeRings") },
      { name: "rangeRingColor", value: game.settings.get("token-radar", "rangeRingColor") }
    ];
    return { settings };
  }

  async _updateObject(event, formData) {
    console.log("Radar Settings Submitted:", formData);
  
    const settings = {
      hostileColor: formData.hostileColor,
      neutralColor: formData.neutralColor,
      friendlyColor: formData.friendlyColor,
      selfColor: formData.selfColor,
      backgroundGradient: formData.backgroundGradient,
      maxDistance: Number(formData.maxDistance),
      rangeRingColor: formData.rangeRingColor,
      showRangeRings: !!formData.showRangeRings // This handles missing checkbox
    };
  
    // Write settings to Foundry
    for (const [key, value] of Object.entries(settings)) {
      await game.settings.set("token-radar", key, value);
      console.log(`Saved: token-radar.${key} =`, value);
    }
  
    TokenRadar.createRadarHUD();
    TokenRadar.getDebouncedUpdate()();
    this.close();
  }
  
  
}

const TokenRadar = (() => {
  // Private implementation
  const debounce = (func, wait) => {
    let timeout;
    return function() {
      const context = this, args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  };

  const drawRangeRings = (ctx, radarSize, maxDistance) => {
    const showRings = game.settings.get("token-radar", "showRangeRings");   
    if (!showRings) return;
  
    const ringColor = game.settings.get("token-radar", "rangeRingColor") || "rgba(0,255,0,0.2)";
    const radarRadius = radarSize / 2;
  
    ctx.strokeStyle = ringColor;
    ctx.fillStyle = ringColor;
    ctx.lineWidth = 1;
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
  
    // Draw rings every 5 units up to maxDistance
    const step = 5;
    for (let dist = step; dist <= maxDistance; dist += step) {
      const ringRadius = (dist / maxDistance) * (radarRadius - 5);
  
      ctx.beginPath();
      ctx.arc(radarRadius, radarRadius, ringRadius, 0, 2 * Math.PI);
      ctx.stroke();
  
      ctx.fillText(`${dist}`, radarRadius, radarRadius - ringRadius - 5);
    }
  };
  

  const updateRadar = () => {
    if (!isCanvasReady()) {
      setTimeout(updateRadar, 100);
      return;
    }

    const canvasEl = document.getElementById("radar-canvas");
    if (!canvasEl) return;
    
    updateRadarCanvasSize();

    const radarSize = game.settings.get("token-radar", "radarSize");
    const maxDistance = game.settings.get("token-radar", "maxDistance");
    const blipSize = game.settings.get("token-radar", "blipSize");
    const ctx = canvasEl.getContext("2d");
    ctx.clearRect(0, 0, radarSize, radarSize);

    const selected = canvas.tokens?.controlled[0];
    if (!selected || !selected.center) return;

    const radarRadius = radarSize / 2;
    const origin = selected.center;

    // Draw radar circle
    ctx.beginPath();
    ctx.arc(radarRadius, radarRadius, radarRadius - 1, 0, 2 * Math.PI);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw crosshairs
    ctx.strokeStyle = "rgba(0,255,0,0.2)";
    ctx.beginPath();
    ctx.moveTo(radarRadius, 0);
    ctx.lineTo(radarRadius, radarSize);
    ctx.moveTo(0, radarRadius);
    ctx.lineTo(radarSize, radarRadius);
    ctx.stroke();

    // Draw range rings
    drawRangeRings(ctx, radarSize, maxDistance);

    // Draw player dot
    ctx.beginPath();
    ctx.fillStyle = game.settings.get("token-radar", "selfColor");
    ctx.arc(radarRadius, radarRadius, Math.max(3, blipSize * 0.75), 0, 2 * Math.PI);
    ctx.fill();

    // Process other tokens
    for (let other of canvas.tokens?.placeables || []) {
      if (!other.visible || other.id === selected.id) continue;

      let dist = 0;
      try {
        if (!other.center || !Number.isFinite(other.center.x) || !Number.isFinite(other.center.y)) {
          continue;
        }

        const ray = new Ray(origin, other.center);
        dist = canvas.grid.grid.measureDistances([{ray}], {gridSpaces: true})[0];
      } catch (e) {
        console.warn("Token Radar: Distance measurement failed", e);
        continue;
      }

      if (dist > maxDistance) continue;

      const dx = other.center.x - origin.x;
      const dy = other.center.y - origin.y;
      const angle = Math.atan2(dy, dx);
      const scaledDist = (dist / maxDistance) * (radarRadius - 5);

      const x = radarRadius + scaledDist * Math.cos(angle);
      const y = radarRadius + scaledDist * Math.sin(angle);

      // Determine blip color
      let blipColor;
      switch (other.document.disposition) {
        case CONST.TOKEN_DISPOSITIONS.FRIENDLY:
          blipColor = game.settings.get("token-radar", "friendlyColor");
          break;
        case CONST.TOKEN_DISPOSITIONS.HOSTILE:
          blipColor = game.settings.get("token-radar", "hostileColor");
          break;
        default:
          blipColor = game.settings.get("token-radar", "neutralColor");
      }

      // Draw blip
      ctx.beginPath();
      ctx.fillStyle = blipColor;
      ctx.arc(x, y, blipSize, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const debouncedUpdateRadar = debounce(updateRadar, 100);

  const isCanvasReady = () => {
    return canvas && canvas.tokens && canvas.tokens.placeables;
  };

  const updateRadarCanvasSize = () => {
    const canvasEl = document.getElementById("radar-canvas");
    if (!canvasEl) return;
    const radarSize = game.settings.get("token-radar", "radarSize");
    canvasEl.width = radarSize;
    canvasEl.height = radarSize;
  };

  const removeRadar = () => {
    const existing = document.getElementById("token-radar-hud");
    if (existing) existing.remove();
  };

  const createRadarHUD = () => {
    removeRadar();

    const radarSize = game.settings.get("token-radar", "radarSize");
    const background = game.settings.get("token-radar", "backgroundGradient");
    const position = game.settings.get("token-radar", "position");

    const radarHUD = document.createElement("div");
    radarHUD.id = "token-radar-hud";
    radarHUD.style.position = "absolute";
    radarHUD.style.top = position.top || "10px";
    radarHUD.style.left = position.left || "unset";
    radarHUD.style.right = position.right || "10px";
    radarHUD.style.width = `${radarSize}px`;
    radarHUD.style.height = `${radarSize}px`;
    radarHUD.style.borderRadius = "50%";
    radarHUD.style.background = background;
    radarHUD.style.zIndex = 100;
    radarHUD.style.cursor = "move";
    radarHUD.style.display = "block";

    radarHUD.ondblclick = () => {
      const menu = game.settings.menus.get("token-radar.settingsMenu");
      if (menu) new menu.type().render(true);
    };

    radarHUD.onmousedown = function(event) {
      event.preventDefault();
      let shiftX = event.clientX - radarHUD.getBoundingClientRect().left;
      let shiftY = event.clientY - radarHUD.getBoundingClientRect().top;

      function moveAt(pageX, pageY) {
        radarHUD.style.left = `${pageX - shiftX}px`;
        radarHUD.style.top = `${pageY - shiftY}px`;
        radarHUD.style.right = "auto";
      }

      function onMouseMove(event) {
        moveAt(event.pageX, event.pageY);
      }

      document.addEventListener("mousemove", onMouseMove);

      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("mouseleave", onMouseUp);
        
        game.settings.set("token-radar", "position", {
          top: radarHUD.style.top,
          left: radarHUD.style.left,
          right: radarHUD.style.right
        });
      }

      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("mouseleave", onMouseUp);
    };

    radarHUD.ondragstart = () => false;

    const radarCanvas = document.createElement("canvas");
    radarCanvas.id = "radar-canvas";
    radarHUD.appendChild(radarCanvas);

    document.body.appendChild(radarHUD);
    updateRadarCanvasSize();
  };

  // Public API
  return {
    updateRadar,
    debouncedUpdateRadar,
    createRadarHUD,
    
    initSettings() {
      const useColorPicker = typeof window.ColorSetting !== "undefined";
      
      const registerColor = (key, name, defaultColor) => {
        game.settings.register("token-radar", key, {
          name,
          scope: "client",
          config: true,
          type: useColorPicker ? window.ColorSetting : String,
          default: defaultColor,
          onChange: updateRadar
        });
      };

      registerColor("hostileColor", "Hostile Blip Color", "#ff0000");
      registerColor("neutralColor", "Neutral Blip Color", "#ffff00");
      registerColor("friendlyColor", "Friendly Blip Color", "#00ff00");
      registerColor("selfColor", "Self Dot Color", "#00ff00");
      registerColor("backgroundGradient", "Radar Background Gradient", 
                   "radial-gradient(circle at center, rgba(0,255,0,0.15), rgba(0,0,0,0.9))");


      game.settings.register("token-radar", "showRangeRings", {
        name: "Show Range Rings",
        scope: "client",
        config: true,
        type: Boolean,
        default: true, // Default to true
        onChange: updateRadar
      });

      game.settings.register("token-radar", "rangeRingColor", {
        name: "Range Ring Color",
        scope: "client",
        config: true,
        type: String,
        default: "rgba(0,255,0,0.2)",
        onChange: updateRadar
      });

      game.settings.register("token-radar", "maxDistance", {
        name: "Max Radar Distance (grid units)",
        scope: "client",
        config: true,
        type: Number,
        default: 30,
        range: { min: 5, max: 100, step: 5 },
        onChange: updateRadar
      });

      game.settings.register("token-radar", "radarSize", {
        name: "Radar Size (pixels)",
        scope: "client",
        config: true,
        type: Number,
        default: 150,
        range: { min: 50, max: 300, step: 10 },
        onChange: () => {
          removeRadar();
          createRadarHUD();
        }
      });

      game.settings.register("token-radar", "blipSize", {
        name: "Blip Size (pixels)",
        scope: "client",
        config: true,
        type: Number,
        default: 4,
        range: { min: 2, max: 10, step: 1 },
        onChange: updateRadar
      });

      game.settings.register("token-radar", "position", {
        name: "Radar Position",
        scope: "client",
        type: Object,
        default: { top: "10px", left: "unset", right: "10px" },
        config: false
      });

      game.settings.registerMenu("token-radar", "settingsMenu", {
        name: "Token Radar Settings",
        label: "Configure Token Radar",
        hint: "Open a dedicated settings panel for Token Radar.",
        type: RadarSettingsConfig,
        restricted: false
      });

      game.keybindings.register("token-radar", "toggleRadar", {
        name: "Toggle Radar Visibility",
        hint: "Show/hide the token radar",
        editable: [{ key: "KeyR", modifiers: ["Control"] }],
        onDown: () => {
          const hud = document.getElementById("token-radar-hud");
          if (hud) hud.style.display = hud.style.display === "none" ? "block" : "none";
        }
      });

      if (game.settings.get("token-radar", "showRangeRings") === undefined) {
        game.settings.set("token-radar", "showRangeRings", true);
      }
    },

    onReady() {
      if (canvas.ready) {
        createRadarHUD();
        updateRadar();
      }
    },

    onCanvasReady() {
      removeRadar();
      setTimeout(() => {
        createRadarHUD();
        updateRadar();
      }, 500);
    },

    getDebouncedUpdate() {
      return debouncedUpdateRadar;
    }
  };
})();

// Hook registration
Hooks.once("init", () => TokenRadar.initSettings());
Hooks.once("ready", () => {
  if (game.settings.get("token-radar", "showRangeRings") === false) {
    console.warn("Radar: Resetting showRangeRings to true");
    game.settings.set("token-radar", "showRangeRings", true);
  }
  TokenRadar.onReady();
});

Hooks.on("canvasReady", () => TokenRadar.onCanvasReady());

// Event hooks
const hooks = [
  "updateToken",
  "controlToken",
  "deleteToken", 
  "updateCombat"
];

hooks.forEach(hook => {
  Hooks.on(hook, () => TokenRadar.getDebouncedUpdate()());
});