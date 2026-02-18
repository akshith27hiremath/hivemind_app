"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export function LandingPage() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const heroLabelsRef = useRef<HTMLDivElement>(null);
  const rippleCanvasRef = useRef<HTMLCanvasElement>(null);
  const rippleLabelsRef = useRef<HTMLDivElement>(null);
  const rippleInfoRef = useRef<HTMLDivElement>(null);
  const mockupInsightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const cleanupFns: (() => void)[] = [];
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    // ============ 1. CURSOR ============
    const cursorDot = cursorDotRef.current;
    const cursorRing = cursorRingRef.current;
    let ringX = mouseX, ringY = mouseY;

    if (!isMobile && cursorDot && cursorRing) {
      const onMouseMove = (e: MouseEvent) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorDot.style.left = mouseX + "px";
        cursorDot.style.top = mouseY + "px";
      };
      document.addEventListener("mousemove", onMouseMove);

      let cursorRafId: number;
      const animRing = () => {
        ringX = lerp(ringX, mouseX, 0.12);
        ringY = lerp(ringY, mouseY, 0.12);
        cursorRing.style.left = ringX + "px";
        cursorRing.style.top = ringY + "px";
        cursorRafId = requestAnimationFrame(animRing);
      };
      cursorRafId = requestAnimationFrame(animRing);

      const hoverEnterFns: [Element, () => void][] = [];
      const hoverLeaveFns: [Element, () => void][] = [];
      wrapper.querySelectorAll("a, button").forEach((el) => {
        const enter = () => cursorRing.classList.add("hover");
        const leave = () => cursorRing.classList.remove("hover");
        el.addEventListener("mouseenter", enter);
        el.addEventListener("mouseleave", leave);
        hoverEnterFns.push([el, enter]);
        hoverLeaveFns.push([el, leave]);
      });

      cleanupFns.push(() => {
        document.removeEventListener("mousemove", onMouseMove);
        cancelAnimationFrame(cursorRafId);
        hoverEnterFns.forEach(([el, fn]) => el.removeEventListener("mouseenter", fn));
        hoverLeaveFns.forEach(([el, fn]) => el.removeEventListener("mouseleave", fn));
      });
    }

    // ============ 2. REVEAL ANIMATIONS ============
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt((entry.target as HTMLElement).dataset.delay || "0");
            setTimeout(() => entry.target.classList.add("revealed"), delay);
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    wrapper.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));
    cleanupFns.push(() => revealObserver.disconnect());

    // ============ 3. NAV SCROLL ============
    const nav = navRef.current;
    const onScroll = () => nav?.classList.toggle("scrolled", window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    cleanupFns.push(() => window.removeEventListener("scroll", onScroll));

    // ============ 4. BACKGROUND PARTICLE GRAPH ============
    const bgCanvas = bgCanvasRef.current;
    if (bgCanvas) {
      const ctx = bgCanvas.getContext("2d")!;
      const COUNT = isMobile ? 30 : 70;

      const resizeBg = () => {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
      };
      resizeBg();
      window.addEventListener("resize", resizeBg);

      class Particle {
        x = 0; y = 0; size = 0; vx = 0; vy = 0; alpha = 0;
        constructor() { this.reset(); }
        reset() {
          this.x = Math.random() * bgCanvas.width;
          this.y = Math.random() * bgCanvas.height;
          this.size = Math.random() * 1.5 + 0.5;
          this.vx = (Math.random() - 0.5) * 0.2;
          this.vy = (Math.random() - 0.5) * 0.2;
          this.alpha = Math.random() * 0.3 + 0.05;
        }
        update() {
          this.x += this.vx;
          this.y += this.vy;
          if (this.x < 0 || this.x > bgCanvas.width) this.vx *= -1;
          if (this.y < 0 || this.y > bgCanvas.height) this.vy *= -1;
        }
        draw() {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 175, 55, ${this.alpha})`;
          ctx.fill();
        }
      }

      const particles: Particle[] = [];
      for (let i = 0; i < COUNT; i++) particles.push(new Particle());

      let bgRafId: number;
      const drawBg = () => {
        ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        for (let i = 0; i < particles.length; i++) {
          particles[i].update();
          particles[i].draw();
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(212, 175, 55, ${(1 - dist / 130) * 0.06})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
        bgRafId = requestAnimationFrame(drawBg);
      };
      bgRafId = requestAnimationFrame(drawBg);

      cleanupFns.push(() => {
        cancelAnimationFrame(bgRafId);
        window.removeEventListener("resize", resizeBg);
      });
    }

    // ============ 5. HERO KNOWLEDGE GRAPH ============
    const heroCanvas = heroCanvasRef.current;
    const heroLabelsDiv = heroLabelsRef.current;

    if (heroCanvas && heroLabelsDiv) {
      const hctx = heroCanvas.getContext("2d")!;
      let hw: number, hh: number;

      const resizeHero = () => {
        const rect = heroCanvas.parentElement!.getBoundingClientRect();
        heroCanvas.width = rect.width;
        heroCanvas.height = rect.height;
        hw = heroCanvas.width;
        hh = heroCanvas.height;
      };
      resizeHero();
      window.addEventListener("resize", resizeHero);

      const heroNodes = [
        { id: "Your Portfolio", x: 0.5, y: 0.45, size: 14, type: "center", fixed: true, vx: 0, vy: 0, ox: 0.5, oy: 0.45 },
        { id: "TSLA", x: 0.28, y: 0.30, size: 10, type: "portfolio", fixed: false, vx: 0, vy: 0, ox: 0.28, oy: 0.30 },
        { id: "NVDA", x: 0.72, y: 0.25, size: 10, type: "portfolio", fixed: false, vx: 0, vy: 0, ox: 0.72, oy: 0.25 },
        { id: "AMZN", x: 0.65, y: 0.65, size: 10, type: "portfolio", fixed: false, vx: 0, vy: 0, ox: 0.65, oy: 0.65 },
        { id: "AAPL", x: 0.30, y: 0.68, size: 10, type: "portfolio", fixed: false, vx: 0, vy: 0, ox: 0.30, oy: 0.68 },
        { id: "TSMC", x: 0.88, y: 0.38, size: 7, type: "entity", fixed: false, vx: 0, vy: 0, ox: 0.88, oy: 0.38 },
        { id: "Panasonic", x: 0.12, y: 0.20, size: 6, type: "entity", fixed: false, vx: 0, vy: 0, ox: 0.12, oy: 0.20 },
        { id: "Foxconn", x: 0.15, y: 0.50, size: 6, type: "entity", fixed: false, vx: 0, vy: 0, ox: 0.15, oy: 0.50 },
        { id: "AWS", x: 0.82, y: 0.60, size: 7, type: "entity", fixed: false, vx: 0, vy: 0, ox: 0.82, oy: 0.60 },
        { id: "Fed Rates", x: 0.50, y: 0.10, size: 7, type: "macro", fixed: false, vx: 0, vy: 0, ox: 0.50, oy: 0.10 },
        { id: "EU Regs", x: 0.85, y: 0.80, size: 6, type: "macro", fixed: false, vx: 0, vy: 0, ox: 0.85, oy: 0.80 },
        { id: "China Policy", x: 0.15, y: 0.85, size: 6, type: "macro", fixed: false, vx: 0, vy: 0, ox: 0.15, oy: 0.85 },
        { id: "Shipping", x: 0.40, y: 0.85, size: 5, type: "entity", fixed: false, vx: 0, vy: 0, ox: 0.40, oy: 0.85 },
        { id: "Lithium", x: 0.18, y: 0.38, size: 5, type: "entity", fixed: false, vx: 0, vy: 0, ox: 0.18, oy: 0.38 },
        { id: "AI Chips", x: 0.78, y: 0.15, size: 6, type: "entity", fixed: false, vx: 0, vy: 0, ox: 0.78, oy: 0.15 },
      ];

      heroNodes.forEach((n) => {
        n.vx = (Math.random() - 0.5) * 0.0003;
        n.vy = (Math.random() - 0.5) * 0.0003;
      });

      const heroEdges: [number, number][] = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 6], [1, 13], [1, 12],
        [2, 5], [2, 14],
        [3, 8], [3, 12],
        [4, 7], [4, 5],
        [5, 14],
        [9, 1], [9, 2], [9, 3], [9, 4],
        [10, 3], [10, 8],
        [11, 1], [11, 13],
        [6, 13],
        [7, 11],
      ];

      let hoveredNode = -1;

      heroNodes.forEach((node, i) => {
        const label = document.createElement("div");
        label.className = `graph-label ${node.type === "portfolio" ? "yours" : ""} ${node.type === "center" ? "highlight" : ""}`;
        label.textContent = node.id;
        label.dataset.index = String(i);
        label.addEventListener("mouseenter", () => { hoveredNode = i; });
        label.addEventListener("mouseleave", () => { hoveredNode = -1; });
        heroLabelsDiv.appendChild(label);
      });

      const heroLabels = heroLabelsDiv.children;

      function getConnected(idx: number) {
        const connected = new Set<number>();
        heroEdges.forEach(([a, b]) => {
          if (a === idx) connected.add(b);
          if (b === idx) connected.add(a);
        });
        return connected;
      }

      let heroRunning = false;
      let heroRafId: number;
      const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          heroRunning = entry.isIntersecting;
          if (heroRunning) drawHeroGraph();
        });
      });
      heroObserver.observe(heroCanvas);

      function drawHeroGraph() {
        if (!heroRunning) return;

        hctx.clearRect(0, 0, hw, hh);

        heroNodes.forEach((n) => {
          if (!n.fixed) {
            n.x = n.ox + Math.sin(Date.now() * 0.001 * (n.vx * 5000 + 1)) * 0.015;
            n.y = n.oy + Math.cos(Date.now() * 0.001 * (n.vy * 5000 + 1)) * 0.012;
          }
        });

        const connected = hoveredNode >= 0 ? getConnected(hoveredNode) : null;

        heroEdges.forEach(([a, b]) => {
          const ax = heroNodes[a].x * hw, ay = heroNodes[a].y * hh;
          const bx = heroNodes[b].x * hw, by = heroNodes[b].y * hh;

          let alpha = 0.08;
          if (connected) {
            if (a === hoveredNode || b === hoveredNode) { alpha = 0.35; }
            else { alpha = 0.03; }
          }

          hctx.beginPath();
          hctx.moveTo(ax, ay);
          hctx.lineTo(bx, by);
          hctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
          hctx.lineWidth = alpha > 0.2 ? 1.5 : 0.8;
          hctx.stroke();

          if (alpha > 0.2) {
            const t = (Date.now() % 2000) / 2000;
            const px = ax + (bx - ax) * t;
            const py = ay + (by - ay) * t;
            hctx.beginPath();
            hctx.arc(px, py, 2, 0, Math.PI * 2);
            hctx.fillStyle = `rgba(212, 175, 55, ${0.6 * (1 - t)})`;
            hctx.fill();
          }
        });

        heroNodes.forEach((node, i) => {
          const x = node.x * hw;
          const y = node.y * hh;

          let alpha = 0.6;
          let size = node.size;
          if (connected) {
            if (i === hoveredNode) { alpha = 1; size *= 1.3; }
            else if (connected.has(i)) { alpha = 0.8; size *= 1.1; }
            else { alpha = 0.15; }
          }

          if (alpha > 0.5 && node.type !== "entity") {
            hctx.beginPath();
            hctx.arc(x, y, size + 8, 0, Math.PI * 2);
            hctx.fillStyle = `rgba(212, 175, 55, ${alpha * 0.08})`;
            hctx.fill();
          }

          hctx.beginPath();
          hctx.arc(x, y, size, 0, Math.PI * 2);
          const color = node.type === "center" ? `rgba(212, 175, 55, ${alpha})` :
                        node.type === "portfolio" ? `rgba(212, 175, 55, ${alpha * 0.7})` :
                        node.type === "macro" ? `rgba(200, 160, 80, ${alpha * 0.4})` :
                        `rgba(180, 170, 150, ${alpha * 0.3})`;
          hctx.fillStyle = color;
          hctx.fill();

          if (heroLabels[i]) {
            (heroLabels[i] as HTMLElement).style.left = x + "px";
            (heroLabels[i] as HTMLElement).style.top = (y - size - 14) + "px";

            if (connected) {
              if (i === hoveredNode) heroLabels[i].className = "graph-label highlight";
              else if (connected.has(i)) heroLabels[i].className = `graph-label ${node.type === "portfolio" ? "yours" : ""}`;
              else heroLabels[i].className = "graph-label dim";
            } else {
              heroLabels[i].className = `graph-label ${node.type === "portfolio" ? "yours" : ""} ${node.type === "center" ? "highlight" : ""}`;
            }
          }
        });

        heroRafId = requestAnimationFrame(drawHeroGraph);
      }

      cleanupFns.push(() => {
        cancelAnimationFrame(heroRafId);
        heroObserver.disconnect();
        window.removeEventListener("resize", resizeHero);
        heroLabelsDiv.innerHTML = "";
      });
    }

    // ============ 6. RIPPLE EFFECT ============
    const rippleCanvas = rippleCanvasRef.current;
    const rippleLabelsDiv = rippleLabelsRef.current;
    const rippleInfoDiv = rippleInfoRef.current;

    if (rippleCanvas && rippleLabelsDiv && rippleInfoDiv) {
      const rctx = rippleCanvas.getContext("2d")!;
      let rw: number, rh: number;

      const resizeRipple = () => {
        const rect = rippleCanvas.parentElement!.getBoundingClientRect();
        rippleCanvas.width = rect.width;
        rippleCanvas.height = rect.height;
        rw = rippleCanvas.width;
        rh = rippleCanvas.height;
      };
      resizeRipple();
      window.addEventListener("resize", resizeRipple);

      type RNode = { id: string; x: number; y: number; type: string; hop: number; portfolio?: boolean };
      type RWave = { x: number; y: number; r: number; maxR: number; alpha: number; hop: number };

      const scenarios: {
        title: string;
        nodes: RNode[];
        edges: [number, number][];
        info: { title: string; desc: string; path: string[] };
      }[] = [
        {
          title: "Musk leaves Tesla",
          nodes: [
            { id: "Musk Exits TSLA", x: 0.15, y: 0.35, type: "event", hop: 0 },
            { id: "TSLA", x: 0.32, y: 0.25, type: "direct", hop: 1, portfolio: true },
            { id: "TSLA Stock -18%", x: 0.32, y: 0.50, type: "impact", hop: 1 },
            { id: "Panasonic (supplier)", x: 0.50, y: 0.15, type: "supplier", hop: 2 },
            { id: "CATL Battery", x: 0.50, y: 0.45, type: "supplier", hop: 2 },
            { id: "SpaceX contracts", x: 0.50, y: 0.70, type: "related", hop: 2 },
            { id: "Maersk Shipping", x: 0.70, y: 0.25, type: "indirect", hop: 3, portfolio: true },
            { id: "BHP Lithium", x: 0.70, y: 0.50, type: "indirect", hop: 3 },
            { id: "Your: $SHIP", x: 0.85, y: 0.35, type: "you", hop: 3, portfolio: true },
          ],
          edges: [[0,1],[0,2],[1,3],[1,4],[0,5],[3,6],[4,7],[6,8]],
          info: {
            title: "Musk Exits Tesla \u2014 3-Hop Cascade",
            desc: "A leadership change at Tesla ripples through the supply chain. Parts suppliers reduce orders, shipping volumes drop, and your logistics holding ($SHIP) takes an indirect hit you'd never see coming.",
            path: ["Musk Exit", "TSLA -18%", "Panasonic orders \u2193", "Maersk volume \u2193", "Your: $SHIP"],
          },
        },
        {
          title: "China bans rare earth exports",
          nodes: [
            { id: "China Rare Earth Ban", x: 0.12, y: 0.40, type: "event", hop: 0 },
            { id: "Rare Earth Prices \u2191", x: 0.30, y: 0.20, type: "direct", hop: 1 },
            { id: "EV Battery Costs \u2191", x: 0.30, y: 0.55, type: "impact", hop: 1 },
            { id: "TSLA margins \u2193", x: 0.50, y: 0.18, type: "supplier", hop: 2, portfolio: true },
            { id: "AAPL production \u2193", x: 0.50, y: 0.42, type: "supplier", hop: 2, portfolio: true },
            { id: "Defense stocks \u2191", x: 0.50, y: 0.68, type: "related", hop: 2 },
            { id: "MP Materials \u2191", x: 0.72, y: 0.30, type: "indirect", hop: 3 },
            { id: "Your: NVDA delays", x: 0.72, y: 0.55, type: "you", hop: 3, portfolio: true },
            { id: "Lynas Mining \u2191", x: 0.88, y: 0.42, type: "indirect", hop: 3 },
          ],
          edges: [[0,1],[0,2],[1,3],[2,4],[1,5],[3,6],[4,7],[6,8]],
          info: {
            title: "China Bans Rare Earth Exports \u2014 Supply Chain Shock",
            desc: "A geopolitical move in China cascades through EV batteries, smartphone production, and chip manufacturing. Your NVDA position faces production delays through TSMC's material shortages.",
            path: ["China Ban", "Rare Earth \u2191", "Battery Costs \u2191", "TSMC delays", "Your: NVDA"],
          },
        },
        {
          title: "Fed raises rates 50bps",
          nodes: [
            { id: "Fed +50bps", x: 0.12, y: 0.40, type: "event", hop: 0 },
            { id: "Bond yields \u2191", x: 0.30, y: 0.20, type: "direct", hop: 1 },
            { id: "Growth stocks \u2193", x: 0.30, y: 0.55, type: "impact", hop: 1 },
            { id: "NVDA P/E compression", x: 0.50, y: 0.15, type: "supplier", hop: 2, portfolio: true },
            { id: "Housing starts \u2193", x: 0.50, y: 0.42, type: "related", hop: 2 },
            { id: "USD strengthens", x: 0.50, y: 0.68, type: "related", hop: 2 },
            { id: "AMZN cloud spend \u2193", x: 0.72, y: 0.28, type: "indirect", hop: 3, portfolio: true },
            { id: "EM currencies \u2193", x: 0.72, y: 0.55, type: "indirect", hop: 3 },
            { id: "Your: AAPL intl rev \u2193", x: 0.88, y: 0.42, type: "you", hop: 3, portfolio: true },
          ],
          edges: [[0,1],[0,2],[2,3],[1,4],[1,5],[3,6],[5,7],[7,8]],
          info: {
            title: "Fed Raises Rates \u2014 Macro Ripple Effect",
            desc: "A rate hike compresses growth stock valuations, strengthens the dollar, and reduces international revenue for your AAPL position \u2014 a connection most retail investors completely miss.",
            path: ["Fed +50bps", "USD \u2191", "EM currencies \u2193", "Int'l revenue \u2193", "Your: AAPL"],
          },
        },
      ];

      let currentScenario = 0;
      let activeNode = -1;
      let rippleWaves: RWave[] = [];
      let revealedHops = new Set<number>([0]);

      function buildLabels() {
        rippleLabelsDiv.innerHTML = "";
        const nodes = scenarios[currentScenario].nodes;
        nodes.forEach((node, i) => {
          const label = document.createElement("div");
          label.className = `ripple-node-label ${node.type === "you" || node.portfolio ? "portfolio" : ""}`;
          label.textContent = node.id;
          label.style.left = (node.x * rw) + "px";
          label.style.top = (node.y * rh) + "px";
          label.style.opacity = node.hop === 0 ? "1" : "0";
          label.style.transform = `translate(-50%, -50%) scale(${node.hop === 0 ? 1 : 0.8})`;
          label.dataset.index = String(i);
          label.addEventListener("click", () => triggerRipple(i));
          rippleLabelsDiv.appendChild(label);
        });
      }

      function triggerRipple(nodeIdx: number) {
        const scenario = scenarios[currentScenario];
        const node = scenario.nodes[nodeIdx];
        activeNode = nodeIdx;

        rippleWaves.push({
          x: node.x * rw,
          y: node.y * rh,
          r: 0,
          maxR: Math.max(rw, rh),
          alpha: 0.4,
          hop: node.hop,
        });

        const maxHop = Math.max(...scenario.nodes.map((n) => n.hop));
        let delay = 0;
        for (let h = 0; h <= maxHop; h++) {
          const hopVal = h;
          setTimeout(() => {
            revealedHops.add(hopVal);
            updateLabelVisibility();
          }, delay);
          delay += 400;
        }

        const info = scenario.info;
        rippleInfoDiv.innerHTML = `
          <span class="ripple-info-tag">RIPPLE ANALYSIS \u2014 ${node.hop + 1}-HOP CASCADE</span>
          <div class="ripple-info-title">${info.title}</div>
          <div class="ripple-info-desc">${info.desc}</div>
          <div class="ripple-info-path">
            ${info.path.map((p, i) =>
              `<span class="rip-path-node ${i === 0 ? "origin" : ""} ${i === info.path.length - 1 ? "yours" : ""}">${p}</span>` +
              (i < info.path.length - 1 ? '<span class="rip-path-arrow">\u2192</span>' : "")
            ).join("")}
          </div>
        `;

        const labels = rippleLabelsDiv.children;
        for (let i = 0; i < labels.length; i++) {
          if (i === nodeIdx) labels[i].classList.add("active");
          else labels[i].classList.remove("active");
        }
      }

      function updateLabelVisibility() {
        const scenario = scenarios[currentScenario];
        const labels = rippleLabelsDiv.children;
        for (let i = 0; i < labels.length; i++) {
          const node = scenario.nodes[i];
          if (revealedHops.has(node.hop)) {
            (labels[i] as HTMLElement).style.opacity = "1";
            (labels[i] as HTMLElement).style.transform = "translate(-50%, -50%) scale(1)";
            if (node.type === "you" || node.portfolio) {
              labels[i].classList.add("affected");
            }
          }
        }
      }

      function switchScenario(idx: number) {
        currentScenario = idx;
        activeNode = -1;
        revealedHops = new Set([0]);
        rippleWaves = [];
        buildLabels();
        rippleInfoDiv.innerHTML = '<span class="ripple-info-tag">Click a node to explore the cascade</span>';

        wrapper.querySelectorAll(".ripple-btn").forEach((btn, i) => {
          btn.classList.toggle("active", i === idx);
        });
      }

      const scenarioBtnHandlers: [Element, () => void][] = [];
      wrapper.querySelectorAll(".ripple-btn").forEach((btn) => {
        const handler = () => switchScenario(parseInt((btn as HTMLElement).dataset.scenario || "0"));
        btn.addEventListener("click", handler);
        scenarioBtnHandlers.push([btn, handler]);
      });

      let rippleRunning = false;
      let rippleRafId: number;
      const rippleObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            rippleRunning = entry.isIntersecting;
            if (rippleRunning) { resizeRipple(); buildLabels(); drawRipple(); }
          });
        },
        { threshold: 0.2 }
      );
      rippleObserver.observe(rippleCanvas);

      function drawRipple() {
        if (!rippleRunning) return;

        rctx.clearRect(0, 0, rw, rh);

        const scenario = scenarios[currentScenario];
        const nodes = scenario.nodes;
        const edges = scenario.edges;

        edges.forEach(([a, b]) => {
          if (!revealedHops.has(nodes[a].hop) || !revealedHops.has(nodes[b].hop)) return;

          const ax = nodes[a].x * rw, ay = nodes[a].y * rh;
          const bx = nodes[b].x * rw, by = nodes[b].y * rh;

          rctx.beginPath();
          rctx.moveTo(ax, ay);
          rctx.lineTo(bx, by);

          const isActive = (a === activeNode || b === activeNode);
          rctx.strokeStyle = isActive ? "rgba(212, 175, 55, 0.4)" : "rgba(212, 175, 55, 0.1)";
          rctx.lineWidth = isActive ? 1.5 : 0.8;
          rctx.stroke();

          if (revealedHops.size > 1) {
            const t = ((Date.now() + a * 300) % 2000) / 2000;
            const px = ax + (bx - ax) * t;
            const py = ay + (by - ay) * t;
            rctx.beginPath();
            rctx.arc(px, py, 1.5, 0, Math.PI * 2);
            rctx.fillStyle = `rgba(212, 175, 55, ${0.5 * (1 - t)})`;
            rctx.fill();
          }
        });

        nodes.forEach((node, i) => {
          if (!revealedHops.has(node.hop)) return;

          const x = node.x * rw;
          const y = node.y * rh;
          const size = node.type === "event" ? 10 : node.type === "you" ? 9 : 6;

          if (node.type === "event" || node.type === "you") {
            rctx.beginPath();
            rctx.arc(x, y, size + 12, 0, Math.PI * 2);
            rctx.fillStyle = `rgba(212, 175, 55, ${0.06 + Math.sin(Date.now() * 0.003) * 0.03})`;
            rctx.fill();
          }

          rctx.beginPath();
          rctx.arc(x, y, size, 0, Math.PI * 2);
          const alpha = node.type === "event" ? 0.9 : node.type === "you" ? 0.8 : node.portfolio ? 0.5 : 0.3;
          rctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
          rctx.fill();
        });

        rippleWaves = rippleWaves.filter((w) => w.alpha > 0.01);
        rippleWaves.forEach((wave) => {
          wave.r += 3;
          wave.alpha *= 0.98;
          rctx.beginPath();
          rctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
          rctx.strokeStyle = `rgba(212, 175, 55, ${wave.alpha})`;
          rctx.lineWidth = 1;
          rctx.stroke();
        });

        const labels = rippleLabelsDiv.children;
        for (let i = 0; i < labels.length && i < nodes.length; i++) {
          (labels[i] as HTMLElement).style.left = (nodes[i].x * rw) + "px";
          (labels[i] as HTMLElement).style.top = (nodes[i].y * rh) + "px";
        }

        rippleRafId = requestAnimationFrame(drawRipple);
      }

      cleanupFns.push(() => {
        cancelAnimationFrame(rippleRafId);
        rippleObserver.disconnect();
        window.removeEventListener("resize", resizeRipple);
        rippleLabelsDiv.innerHTML = "";
        scenarioBtnHandlers.forEach(([el, fn]) => el.removeEventListener("click", fn));
      });
    }

    // ============ 7. COUNTER ANIMATION ============
    const counterObservers: IntersectionObserver[] = [];
    wrapper.querySelectorAll("[data-count]").forEach((el) => {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = parseFloat((el as HTMLElement).dataset.count || "0");
              const duration = 2000;
              const start = performance.now();
              function update(now: number) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = target * eased;
                if (target >= 100) el.textContent = Math.floor(current).toLocaleString();
                else if (target >= 10) el.textContent = String(Math.floor(current));
                else el.textContent = current.toFixed(target % 1 !== 0 ? 2 : 0);
                if (progress < 1) requestAnimationFrame(update);
              }
              requestAnimationFrame(update);
              obs.unobserve(el);
            }
          });
        },
        { threshold: 0.5 }
      );
      obs.observe(el);
      counterObservers.push(obs);
    });
    cleanupFns.push(() => counterObservers.forEach((o) => o.disconnect()));

    // ============ 8. INSIGHT HIGHLIGHT ============
    const insightEl = mockupInsightRef.current;
    if (insightEl) {
      const insightObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              insightEl.style.borderLeft = "3px solid var(--amber)";
              insightEl.style.background = "rgba(212,175,55,0.03)";
              insightObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      insightObserver.observe(insightEl);
      cleanupFns.push(() => insightObserver.disconnect());
    }

    // ============ 9. SMOOTH ANCHORS ============
    const anchorHandlers: [Element, (e: Event) => void][] = [];
    wrapper.querySelectorAll('a[href^="#"]').forEach((a) => {
      const handler = (e: Event) => {
        const href = a.getAttribute("href");
        if (href) {
          const target = wrapper.querySelector(href) || document.querySelector(href);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth" });
          }
        }
      };
      a.addEventListener("click", handler);
      anchorHandlers.push([a, handler]);
    });
    cleanupFns.push(() => anchorHandlers.forEach(([el, fn]) => el.removeEventListener("click", fn)));

    // ============ 10. PAGE LOAD FADE-IN ============
    wrapper.style.opacity = "0";
    wrapper.style.transition = "opacity 0.6s ease";
    requestAnimationFrame(() => {
      wrapper.style.opacity = "1";
      wrapper.querySelectorAll("[data-reveal]").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          const delay = parseInt((el as HTMLElement).dataset.delay || "0");
          setTimeout(() => el.classList.add("revealed"), delay);
        }
      });
    });

    // ============ MASTER CLEANUP ============
    return () => { cleanupFns.forEach((fn) => fn()); };
  }, []);

  return (
    <div className="landing-page" ref={wrapperRef}>
      {/* Grain */}
      <div className="grain" />

      {/* Cursor */}
      <div className="cursor-dot" ref={cursorDotRef} />
      <div className="cursor-ring" ref={cursorRingRef} />

      {/* Background Graph */}
      <canvas id="bg-graph" ref={bgCanvasRef} />

      {/* ===== NAV ===== */}
      <nav className="nav" ref={navRef}>
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <svg className="logo-icon" width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="3" fill="currentColor" />
              <circle cx="14" cy="4" r="2" fill="currentColor" opacity="0.6" />
              <circle cx="23" cy="9" r="2" fill="currentColor" opacity="0.6" />
              <circle cx="23" cy="19" r="2" fill="currentColor" opacity="0.6" />
              <circle cx="14" cy="24" r="2" fill="currentColor" opacity="0.6" />
              <circle cx="5" cy="19" r="2" fill="currentColor" opacity="0.6" />
              <circle cx="5" cy="9" r="2" fill="currentColor" opacity="0.6" />
              <line x1="14" y1="14" x2="14" y2="4" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
              <line x1="14" y1="14" x2="23" y2="9" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
              <line x1="14" y1="14" x2="23" y2="19" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
              <line x1="14" y1="14" x2="14" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
              <line x1="14" y1="14" x2="5" y2="19" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
              <line x1="14" y1="14" x2="5" y2="9" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
            </svg>
            <span>hivemind</span>
          </a>
          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#ripple">The Ripple Effect</a>
            <a href="#daily-brief">Daily Brief</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-right">
            <Link href="/sign-in" className="nav-link-sign">Sign In</Link>
            <Link href="/sign-up" className="btn btn-primary btn-nav">Get Early Access</Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero" id="hero">
        <div className="hero-content">
          <div className="hero-badge" data-reveal>
            <span className="badge-dot" />
            Now in Early Access
          </div>

          <h1 className="hero-title" data-reveal data-delay="100">
            <span className="hero-line">Your portfolio is</span>
            <span className="hero-line">connected to <em className="hero-em">everything.</em></span>
            <span className="hero-line">We show you <span className="hero-highlight">how.</span></span>
          </h1>

          <p className="hero-sub" data-reveal data-delay="200">
            Hivemind maps the hidden relationships between your holdings and
            the world&apos;s financial events. One daily brief. Every connection
            that matters. Nothing that doesn&apos;t.
          </p>

          <div className="hero-actions" data-reveal data-delay="300">
            <Link href="/sign-up" className="btn btn-primary btn-large">
              <span>Start Free — 3 Stocks</span>
            </Link>
            <a href="#ripple" className="btn btn-ghost btn-large">
              <span>See it in action</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </a>
          </div>

          <div className="hero-proof" data-reveal data-delay="400">
            <div className="hero-avatars">
              <div className="avatar" style={{ "--hue": "210" } as React.CSSProperties}>JK</div>
              <div className="avatar" style={{ "--hue": "30" } as React.CSSProperties}>SR</div>
              <div className="avatar" style={{ "--hue": "150" } as React.CSSProperties}>ML</div>
              <div className="avatar" style={{ "--hue": "280" } as React.CSSProperties}>DP</div>
              <div className="avatar avatar-more">+2.4k</div>
            </div>
            <span className="hero-proof-text">Join 2,400+ investors in early access</span>
          </div>
        </div>

        {/* Hero Interactive Graph */}
        <div className="hero-graph-container" data-reveal data-delay="300">
          <canvas ref={heroCanvasRef} className="hero-graph-canvas" />
          <div className="hero-graph-labels" ref={heroLabelsRef} />
        </div>

        <div className="scroll-cue">
          <span>Scroll to explore</span>
          <div className="scroll-cue-line"><div className="scroll-cue-dot" /></div>
        </div>
      </section>

      {/* ===== PAIN SECTION ===== */}
      <section className="pain-section">
        <div className="landing-container">
          <div className="pain-grid">
            <div className="pain-left" data-reveal>
              <span className="section-tag">The Problem</span>
              <h2 className="pain-title">You&apos;re managing a portfolio<br />with a <em>newspaper</em> and a <em>prayer.</em></h2>
            </div>
            <div className="pain-right">
              <div className="pain-card" data-reveal data-delay="100">
                <div className="pain-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
                <h3>200+ hours/year</h3>
                <p>The average engaged investor spends scanning news, cross-referencing sources, and trying to connect dots manually.</p>
              </div>
              <div className="pain-card" data-reveal data-delay="200">
                <div className="pain-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h3>Blindsided by connections</h3>
                <p>A regulatory change in China affects your semiconductor stock through three layers of supply chain. You&apos;d never catch it in time.</p>
              </div>
              <div className="pain-card" data-reveal data-delay="300">
                <div className="pain-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h3>$24,000/yr for Bloomberg</h3>
                <p>Institutional-grade intelligence exists — but it&apos;s priced for hedge funds, not individual investors managing their own money.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MARQUEE ===== */}
      <section className="marquee-section">
        <div className="marquee-track">
          <div className="marquee-slide">
            <span>SEC FILINGS</span><span className="m-dot">{"\u2022"}</span>
            <span>EARNINGS REPORTS</span><span className="m-dot">{"\u2022"}</span>
            <span>SUPPLY CHAIN DATA</span><span className="m-dot">{"\u2022"}</span>
            <span>MACRO INDICATORS</span><span className="m-dot">{"\u2022"}</span>
            <span>EXECUTIVE CHANGES</span><span className="m-dot">{"\u2022"}</span>
            <span>REGULATORY FILINGS</span><span className="m-dot">{"\u2022"}</span>
            <span>INDUSTRY REPORTS</span><span className="m-dot">{"\u2022"}</span>
            <span>NEWS WIRE</span><span className="m-dot">{"\u2022"}</span>
            <span>SEC FILINGS</span><span className="m-dot">{"\u2022"}</span>
            <span>EARNINGS REPORTS</span><span className="m-dot">{"\u2022"}</span>
            <span>SUPPLY CHAIN DATA</span><span className="m-dot">{"\u2022"}</span>
            <span>MACRO INDICATORS</span><span className="m-dot">{"\u2022"}</span>
            <span>EXECUTIVE CHANGES</span><span className="m-dot">{"\u2022"}</span>
            <span>REGULATORY FILINGS</span><span className="m-dot">{"\u2022"}</span>
            <span>INDUSTRY REPORTS</span><span className="m-dot">{"\u2022"}</span>
            <span>NEWS WIRE</span><span className="m-dot">{"\u2022"}</span>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="how-it-works" id="how-it-works">
        <div className="landing-container">
          <div className="section-header" data-reveal>
            <span className="section-tag">How It Works</span>
            <h2 className="section-title">From noise to signal<br />in three steps.</h2>
          </div>

          <div className="steps-row">
            <div className="step-card" data-reveal>
              <div className="step-num">01</div>
              <div className="step-visual">
                <div className="connect-demo">
                  <div className="connect-slot"><span className="slot-icon">+</span><span>AAPL</span></div>
                  <div className="connect-slot filled"><span className="slot-check">{"\u2713"}</span><span>TSLA</span></div>
                  <div className="connect-slot filled"><span className="slot-check">{"\u2713"}</span><span>NVDA</span></div>
                  <div className="connect-slot"><span className="slot-icon">+</span><span>Add stock</span></div>
                </div>
              </div>
              <h3>Connect your portfolio</h3>
              <p>Add your holdings manually or sync your brokerage. Hivemind maps every stock against our knowledge graph.</p>
            </div>

            <div className="step-card" data-reveal data-delay="150">
              <div className="step-num">02</div>
              <div className="step-visual">
                <div className="scan-demo">
                  <div className="scan-line" />
                  <div className="scan-source">Reuters <span className="scan-check">{"\u2713"}</span></div>
                  <div className="scan-source">SEC EDGAR <span className="scan-check">{"\u2713"}</span></div>
                  <div className="scan-source active">Industry Reports <span className="scan-spinner" /></div>
                  <div className="scan-source dim">Earnings Calls</div>
                  <div className="scan-source dim">Macro Data</div>
                  <div className="scan-count">2,847 sources scanned</div>
                </div>
              </div>
              <h3>We scan everything</h3>
              <p>Thousands of sources — news, filings, earnings, reports — processed daily through our knowledge graph for relevance.</p>
            </div>

            <div className="step-card" data-reveal data-delay="300">
              <div className="step-num">03</div>
              <div className="step-visual">
                <div className="brief-demo">
                  <div className="brief-header">
                    <span className="brief-date">Today&apos;s Brief</span>
                    <span className="brief-count">4 insights</span>
                  </div>
                  <div className="brief-item high">
                    <span className="brief-dot" />
                    <span>NVDA supply chain disruption via TSMC</span>
                  </div>
                  <div className="brief-item medium">
                    <span className="brief-dot" />
                    <span>New EU AI regulation affects 3 holdings</span>
                  </div>
                  <div className="brief-item low">
                    <span className="brief-dot" />
                    <span>TSLA earnings beat — supplier impact</span>
                  </div>
                </div>
              </div>
              <h3>One daily brief</h3>
              <p>Every morning, you get one digestible overview. What matters, why it matters, and how it connects to your money.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RIPPLE EFFECT ===== */}
      <section className="ripple-section" id="ripple">
        <div className="landing-container">
          <div className="section-header" data-reveal>
            <span className="section-tag">The Ripple Effect</span>
            <h2 className="section-title">The connection your<br />analyst would catch.<br /><em>Now you can too.</em></h2>
            <p className="section-sub">Click any event node to see how one headline creates cascading effects across your portfolio.</p>
          </div>

          <div className="ripple-stage" data-reveal>
            <canvas ref={rippleCanvasRef} className="ripple-canvas" />
            <div ref={rippleLabelsRef} className="ripple-labels" />
            <div className="ripple-info">
              <div className="ripple-info-inner" ref={rippleInfoRef}>
                <span className="ripple-info-tag">Click a node to explore</span>
              </div>
            </div>
          </div>

          <div className="ripple-examples" data-reveal>
            <button className="ripple-btn active" data-scenario="0">Musk leaves Tesla</button>
            <button className="ripple-btn" data-scenario="1">China bans rare earths</button>
            <button className="ripple-btn" data-scenario="2">Fed raises rates</button>
          </div>
        </div>
      </section>

      {/* ===== DAILY BRIEF PREVIEW ===== */}
      <section className="brief-section" id="daily-brief">
        <div className="landing-container">
          <div className="brief-layout">
            <div className="brief-text" data-reveal>
              <span className="section-tag">The Daily Brief</span>
              <h2 className="section-title">Your morning<br />just got<br /><em>45 minutes shorter.</em></h2>
              <p className="brief-desc">No more scanning Reuters, CNBC, Seeking Alpha, Twitter, and SEC filings. Hivemind distills thousands of data points into one clear, personalized overview every morning before you open your trading app.</p>
              <div className="brief-stats">
                <div className="brief-stat">
                  <span className="brief-stat-num" data-count="4247">0</span>
                  <span className="brief-stat-label">Sources scanned daily</span>
                </div>
                <div className="brief-stat">
                  <span className="brief-stat-num" data-count="3">0</span>
                  <span className="brief-stat-label">Minutes to read</span>
                </div>
              </div>
            </div>

            <div className="brief-preview" data-reveal data-delay="200">
              <div className="brief-mockup">
                <div className="mockup-header">
                  <div className="mockup-top">
                    <span className="mockup-day">Monday, Feb 13</span>
                    <span className="mockup-portfolio">Your Portfolio Brief</span>
                  </div>
                  <div className="mockup-summary">
                    <div className="summary-badge summary-high">2 High Impact</div>
                    <div className="summary-badge summary-med">1 Medium</div>
                    <div className="summary-badge summary-low">3 Low</div>
                  </div>
                </div>

                <div className="mockup-insight" ref={mockupInsightRef}>
                  <div className="insight-header">
                    <span className="insight-impact high">HIGH IMPACT</span>
                    <span className="insight-stocks">NVDA, AMD, TSM</span>
                  </div>
                  <h4>TSMC reports capacity constraints — GPU shortage likely through Q3</h4>
                  <p>TSMC&apos;s latest filing reveals fab utilization at 98%. This directly constrains NVIDIA&apos;s H100 production timeline and creates pricing pressure across your semiconductor holdings.</p>
                  <div className="insight-path">
                    <span className="path-node">TSMC Filing</span>
                    <span className="path-arrow">{"\u2192"}</span>
                    <span className="path-node">GPU Supply</span>
                    <span className="path-arrow">{"\u2192"}</span>
                    <span className="path-node path-yours">Your: NVDA</span>
                  </div>
                </div>

                <div className="mockup-insight">
                  <div className="insight-header">
                    <span className="insight-impact medium">MEDIUM</span>
                    <span className="insight-stocks">AMZN, SHOP</span>
                  </div>
                  <h4>EU Digital Markets Act enforcement begins — e-commerce impact</h4>
                  <p>New compliance requirements may affect marketplace operations for your retail holdings across European markets.</p>
                  <div className="insight-path">
                    <span className="path-node">EU Regulation</span>
                    <span className="path-arrow">{"\u2192"}</span>
                    <span className="path-node">E-Commerce</span>
                    <span className="path-arrow">{"\u2192"}</span>
                    <span className="path-node path-yours">Your: AMZN</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="proof-section">
        <div className="landing-container">
          <div className="section-header" data-reveal>
            <span className="section-tag">What Investors Say</span>
            <h2 className="section-title">Real investors.<br /><em>Real edge.</em></h2>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial" data-reveal>
              <p>&ldquo;I was spending 45 minutes every morning just reading headlines. Now I get one brief that tells me exactly what I need to know about my 12 holdings. The ripple connections alone are worth the subscription.&rdquo;</p>
              <div className="testimonial-author">
                <div className="avatar" style={{ "--hue": "210" } as React.CSSProperties}>JK</div>
                <div><strong>Jake K.</strong><span>Retail investor, 14 stocks</span></div>
              </div>
            </div>
            <div className="testimonial" data-reveal data-delay="100">
              <p>&ldquo;Hivemind caught that the CHIPS Act would affect my logistics holdings before anyone on FinTwit was talking about it. That&apos;s 2nd-order thinking that I genuinely cannot do at scale on my own.&rdquo;</p>
              <div className="testimonial-author">
                <div className="avatar" style={{ "--hue": "30" } as React.CSSProperties}>SR</div>
                <div><strong>Sarah R.</strong><span>Software engineer, 8 stocks</span></div>
              </div>
            </div>
            <div className="testimonial" data-reveal data-delay="200">
              <p>&ldquo;I&apos;ve tried Seeking Alpha, Finviz, stock screeners — nothing connects the dots the way Hivemind does. It&apos;s not more data, it&apos;s better data. Specifically about MY portfolio.&rdquo;</p>
              <div className="testimonial-author">
                <div className="avatar" style={{ "--hue": "150" } as React.CSSProperties}>DM</div>
                <div><strong>David M.</strong><span>Portfolio: $180K across 11 stocks</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMPARISON ===== */}
      <section className="comparison-section">
        <div className="landing-container">
          <div className="section-header" data-reveal>
            <span className="section-tag">Why Hivemind</span>
            <h2 className="section-title">Institutional intelligence.<br /><em>Individual price.</em></h2>
          </div>
          <div className="comparison-table" data-reveal>
            <div className="comp-header">
              <div className="comp-cell comp-feature" />
              <div className="comp-cell comp-them">Free Tools</div>
              <div className="comp-cell comp-bloomberg">Bloomberg</div>
              <div className="comp-cell comp-us">Hivemind</div>
            </div>
            <div className="comp-row">
              <div className="comp-cell comp-feature">Portfolio-specific insights</div>
              <div className="comp-cell comp-them"><span className="comp-no">{"\u00D7"}</span></div>
              <div className="comp-cell comp-bloomberg"><span className="comp-yes">{"\u2713"}</span></div>
              <div className="comp-cell comp-us"><span className="comp-yes">{"\u2713"}</span></div>
            </div>
            <div className="comp-row">
              <div className="comp-cell comp-feature">Multi-hop relationship mapping</div>
              <div className="comp-cell comp-them"><span className="comp-no">{"\u00D7"}</span></div>
              <div className="comp-cell comp-bloomberg"><span className="comp-partial">~</span></div>
              <div className="comp-cell comp-us"><span className="comp-yes">{"\u2713"}</span></div>
            </div>
            <div className="comp-row">
              <div className="comp-cell comp-feature">Daily personalized brief</div>
              <div className="comp-cell comp-them"><span className="comp-no">{"\u00D7"}</span></div>
              <div className="comp-cell comp-bloomberg"><span className="comp-no">{"\u00D7"}</span></div>
              <div className="comp-cell comp-us"><span className="comp-yes">{"\u2713"}</span></div>
            </div>
            <div className="comp-row">
              <div className="comp-cell comp-feature">Supply chain visibility</div>
              <div className="comp-cell comp-them"><span className="comp-no">{"\u00D7"}</span></div>
              <div className="comp-cell comp-bloomberg"><span className="comp-yes">{"\u2713"}</span></div>
              <div className="comp-cell comp-us"><span className="comp-yes">{"\u2713"}</span></div>
            </div>
            <div className="comp-row">
              <div className="comp-cell comp-feature">Built for retail investors</div>
              <div className="comp-cell comp-them"><span className="comp-yes">{"\u2713"}</span></div>
              <div className="comp-cell comp-bloomberg"><span className="comp-no">{"\u00D7"}</span></div>
              <div className="comp-cell comp-us"><span className="comp-yes">{"\u2713"}</span></div>
            </div>
            <div className="comp-row comp-row-price">
              <div className="comp-cell comp-feature">Price</div>
              <div className="comp-cell comp-them">$0</div>
              <div className="comp-cell comp-bloomberg">$24,000/yr</div>
              <div className="comp-cell comp-us"><strong>$29/mo</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="pricing" id="pricing">
        <div className="landing-container">
          <div className="section-header" data-reveal>
            <span className="section-tag">Pricing</span>
            <h2 className="section-title">Start free.<br /><em>Upgrade when you&apos;re hooked.</em></h2>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card" data-reveal>
              <div className="pricing-tier">Free</div>
              <div className="pricing-price">$0</div>
              <div className="pricing-desc">Get a taste of connected intelligence.</div>
              <ul className="pricing-list">
                <li>Track up to 3 stocks</li>
                <li>Weekly portfolio brief</li>
                <li>1-hop relationship mapping</li>
                <li>Basic news aggregation</li>
              </ul>
              <Link href="/sign-up" className="btn btn-ghost btn-full">Get Started Free</Link>
              <div className="pricing-note">No credit card required</div>
            </div>

            <div className="pricing-card pricing-featured" data-reveal data-delay="100">
              <div className="pricing-popular">MOST POPULAR</div>
              <div className="pricing-tier">Pro</div>
              <div className="pricing-price">$29<span>/mo</span></div>
              <div className="pricing-desc">Full portfolio intelligence, daily.</div>
              <ul className="pricing-list">
                <li>Unlimited stocks</li>
                <li>Daily personalized brief</li>
                <li>3-hop deep relationship mapping</li>
                <li>Supply chain &amp; regulatory tracking</li>
                <li>Real-time alert triggers</li>
                <li>Earnings impact forecasting</li>
              </ul>
              <Link href="/sign-up" className="btn btn-primary btn-full">Start 14-Day Trial</Link>
              <div className="pricing-note">Cancel anytime</div>
            </div>

            <div className="pricing-card" data-reveal data-delay="200">
              <div className="pricing-tier">Annual</div>
              <div className="pricing-price">$19<span>/mo</span></div>
              <div className="pricing-desc">Everything in Pro. Billed annually.</div>
              <ul className="pricing-list">
                <li>Everything in Pro</li>
                <li>Save 34% vs monthly</li>
                <li>Priority feature access</li>
                <li>Export briefs to PDF</li>
                <li>API access (coming soon)</li>
              </ul>
              <Link href="/sign-up" className="btn btn-ghost btn-full">Get Annual Plan</Link>
              <div className="pricing-note">$228/yr — save $120</div>
            </div>
          </div>

          <div className="pricing-faq" data-reveal>
            <p className="pricing-disclaimer">Hivemind is a portfolio intelligence tool. We help you understand what&apos;s happening — not what to do about it. This is not investment advice.</p>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-section">
        <div className="landing-container">
          <div className="cta-box" data-reveal>
            <div className="cta-graph-bg" />
            <h2>Institutions have teams of analysts<br />connecting these dots.</h2>
            <p className="cta-sub"><em>You have Hivemind.</em></p>
            <Link href="/sign-up" className="btn btn-primary btn-large">Get Early Access — Free</Link>
            <p className="cta-note">Free tier forever. Upgrade when you&apos;re ready.</p>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <span className="nav-logo">
                <svg className="logo-icon" width="24" height="24" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="3" fill="currentColor" />
                  <circle cx="14" cy="4" r="2" fill="currentColor" opacity="0.6" />
                  <circle cx="23" cy="9" r="2" fill="currentColor" opacity="0.6" />
                  <circle cx="23" cy="19" r="2" fill="currentColor" opacity="0.6" />
                  <circle cx="14" cy="24" r="2" fill="currentColor" opacity="0.6" />
                  <circle cx="5" cy="19" r="2" fill="currentColor" opacity="0.6" />
                  <circle cx="5" cy="9" r="2" fill="currentColor" opacity="0.6" />
                </svg>
                <span>hivemind</span>
              </span>
              <p>Portfolio intelligence for the individual investor. See the connections Wall Street sees.</p>
            </div>
            <div className="footer-col"><h4>Product</h4><a href="#">Features</a><a href="#">Pricing</a><a href="#">Changelog</a><a href="#">Roadmap</a></div>
            <div className="footer-col"><h4>Resources</h4><a href="#">How It Works</a><a href="#">Blog</a><a href="#">Case Studies</a><a href="#">FAQ</a></div>
            <div className="footer-col"><h4>Legal</h4><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Disclaimers</a><a href="#">Security</a></div>
          </div>
          <div className="footer-bottom">
            <span>{"\u00A9"} 2026 Hivemind. Not investment advice.</span>
            <div className="footer-socials">
              <a href="#">Twitter/X</a>
              <a href="#">LinkedIn</a>
              <a href="#">Reddit</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
