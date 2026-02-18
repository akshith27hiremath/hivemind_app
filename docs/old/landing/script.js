// ============================================
// HIVEMIND — Portfolio Intelligence Engine
// ============================================

(function () {
    'use strict';

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;

    // ============================================
    // 1. CURSOR
    // ============================================
    const cursorDot = document.getElementById('cursor-dot');
    const cursorRing = document.getElementById('cursor-ring');
    let ringX = mouseX, ringY = mouseY;

    if (!isMobile && cursorDot && cursorRing) {
        document.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursorDot.style.left = mouseX + 'px';
            cursorDot.style.top = mouseY + 'px';
        });
        (function animRing() {
            ringX = lerp(ringX, mouseX, 0.12);
            ringY = lerp(ringY, mouseY, 0.12);
            cursorRing.style.left = ringX + 'px';
            cursorRing.style.top = ringY + 'px';
            requestAnimationFrame(animRing);
        })();
        document.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('mouseenter', () => cursorRing.classList.add('hover'));
            el.addEventListener('mouseleave', () => cursorRing.classList.remove('hover'));
        });
    }

    // ============================================
    // 2. REVEAL ANIMATIONS
    // ============================================
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay || 0);
                setTimeout(() => entry.target.classList.add('revealed'), delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

    // ============================================
    // 3. NAV SCROLL
    // ============================================
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60));

    // ============================================
    // 4. BACKGROUND PARTICLE GRAPH
    // ============================================
    const bgCanvas = document.getElementById('bg-graph');
    if (bgCanvas) {
        const ctx = bgCanvas.getContext('2d');
        let particles = [];
        const COUNT = isMobile ? 30 : 70;

        function resizeBg() { bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight; }
        resizeBg();
        window.addEventListener('resize', resizeBg);

        class Particle {
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

        for (let i = 0; i < COUNT; i++) particles.push(new Particle());

        function drawBg() {
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
            requestAnimationFrame(drawBg);
        }
        drawBg();
    }

    // ============================================
    // 5. HERO KNOWLEDGE GRAPH (Interactive)
    // ============================================
    const heroCanvas = document.getElementById('hero-graph');
    const heroLabelsDiv = document.getElementById('hero-graph-labels');

    if (heroCanvas && heroLabelsDiv) {
        const hctx = heroCanvas.getContext('2d');
        let hw, hh;

        function resizeHero() {
            const rect = heroCanvas.parentElement.getBoundingClientRect();
            heroCanvas.width = rect.width;
            heroCanvas.height = rect.height;
            hw = heroCanvas.width;
            hh = heroCanvas.height;
        }
        resizeHero();
        window.addEventListener('resize', resizeHero);

        // Build the knowledge graph nodes
        const heroNodes = [
            { id: 'Your Portfolio', x: 0.5, y: 0.45, size: 14, type: 'center', fixed: true },
            // Portfolio holdings
            { id: 'TSLA', x: 0.28, y: 0.30, size: 10, type: 'portfolio' },
            { id: 'NVDA', x: 0.72, y: 0.25, size: 10, type: 'portfolio' },
            { id: 'AMZN', x: 0.65, y: 0.65, size: 10, type: 'portfolio' },
            { id: 'AAPL', x: 0.30, y: 0.68, size: 10, type: 'portfolio' },
            // Connected entities
            { id: 'TSMC', x: 0.88, y: 0.38, size: 7, type: 'entity' },
            { id: 'Panasonic', x: 0.12, y: 0.20, size: 6, type: 'entity' },
            { id: 'Foxconn', x: 0.15, y: 0.50, size: 6, type: 'entity' },
            { id: 'AWS', x: 0.82, y: 0.60, size: 7, type: 'entity' },
            { id: 'Fed Rates', x: 0.50, y: 0.10, size: 7, type: 'macro' },
            { id: 'EU Regs', x: 0.85, y: 0.80, size: 6, type: 'macro' },
            { id: 'China Policy', x: 0.15, y: 0.85, size: 6, type: 'macro' },
            { id: 'Shipping', x: 0.40, y: 0.85, size: 5, type: 'entity' },
            { id: 'Lithium', x: 0.18, y: 0.38, size: 5, type: 'entity' },
            { id: 'AI Chips', x: 0.78, y: 0.15, size: 6, type: 'entity' },
        ];

        const heroEdges = [
            [0, 1], [0, 2], [0, 3], [0, 4], // portfolio connections
            [1, 6], [1, 13], [1, 12], // TSLA connections
            [2, 5], [2, 14], // NVDA connections
            [3, 8], [3, 12], // AMZN connections
            [4, 7], [4, 5], // AAPL connections
            [5, 14], // TSMC -> AI Chips
            [9, 1], [9, 2], [9, 3], [9, 4], // Fed affects all
            [10, 3], [10, 8], // EU regs
            [11, 1], [11, 13], // China policy
            [6, 13], // Panasonic -> Lithium
            [7, 11], // Foxconn -> China
        ];

        // Add velocity for subtle floating
        heroNodes.forEach(n => {
            n.vx = (Math.random() - 0.5) * 0.0003;
            n.vy = (Math.random() - 0.5) * 0.0003;
            n.ox = n.x;
            n.oy = n.y;
        });

        let hoveredNode = -1;

        // Create labels
        heroNodes.forEach((node, i) => {
            const label = document.createElement('div');
            label.className = `graph-label ${node.type === 'portfolio' ? 'yours' : ''} ${node.type === 'center' ? 'highlight' : ''}`;
            label.textContent = node.id;
            label.dataset.index = i;
            label.addEventListener('mouseenter', () => { hoveredNode = i; });
            label.addEventListener('mouseleave', () => { hoveredNode = -1; });
            heroLabelsDiv.appendChild(label);
        });

        const heroLabels = heroLabelsDiv.children;

        // Find connected nodes
        function getConnected(idx) {
            const connected = new Set();
            heroEdges.forEach(([a, b]) => {
                if (a === idx) connected.add(b);
                if (b === idx) connected.add(a);
            });
            return connected;
        }

        let heroRunning = false;
        const heroObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                heroRunning = entry.isIntersecting;
                if (heroRunning) drawHeroGraph();
            });
        });
        heroObserver.observe(heroCanvas);

        function drawHeroGraph() {
            if (!heroRunning) return;

            hctx.clearRect(0, 0, hw, hh);

            // Float nodes gently
            heroNodes.forEach(n => {
                if (!n.fixed) {
                    n.x = n.ox + Math.sin(Date.now() * 0.001 * (n.vx * 5000 + 1)) * 0.015;
                    n.y = n.oy + Math.cos(Date.now() * 0.001 * (n.vy * 5000 + 1)) * 0.012;
                }
            });

            const connected = hoveredNode >= 0 ? getConnected(hoveredNode) : null;

            // Draw edges
            heroEdges.forEach(([a, b]) => {
                const ax = heroNodes[a].x * hw, ay = heroNodes[a].y * hh;
                const bx = heroNodes[b].x * hw, by = heroNodes[b].y * hh;

                let alpha = 0.08;
                if (connected) {
                    if ((a === hoveredNode || b === hoveredNode)) {
                        alpha = 0.35;
                    } else {
                        alpha = 0.03;
                    }
                }

                hctx.beginPath();
                hctx.moveTo(ax, ay);
                hctx.lineTo(bx, by);
                hctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
                hctx.lineWidth = alpha > 0.2 ? 1.5 : 0.8;
                hctx.stroke();

                // Pulse along connected edges
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

            // Draw nodes
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

                // Glow
                if (alpha > 0.5 && node.type !== 'entity') {
                    hctx.beginPath();
                    hctx.arc(x, y, size + 8, 0, Math.PI * 2);
                    hctx.fillStyle = `rgba(212, 175, 55, ${alpha * 0.08})`;
                    hctx.fill();
                }

                hctx.beginPath();
                hctx.arc(x, y, size, 0, Math.PI * 2);
                const color = node.type === 'center' ? `rgba(212, 175, 55, ${alpha})` :
                              node.type === 'portfolio' ? `rgba(212, 175, 55, ${alpha * 0.7})` :
                              node.type === 'macro' ? `rgba(200, 160, 80, ${alpha * 0.4})` :
                              `rgba(180, 170, 150, ${alpha * 0.3})`;
                hctx.fillStyle = color;
                hctx.fill();

                // Update label position
                if (heroLabels[i]) {
                    heroLabels[i].style.left = x + 'px';
                    heroLabels[i].style.top = (y - size - 14) + 'px';

                    if (connected) {
                        if (i === hoveredNode) heroLabels[i].className = 'graph-label highlight';
                        else if (connected.has(i)) heroLabels[i].className = `graph-label ${node.type === 'portfolio' ? 'yours' : ''}`;
                        else heroLabels[i].className = 'graph-label dim';
                    } else {
                        heroLabels[i].className = `graph-label ${node.type === 'portfolio' ? 'yours' : ''} ${node.type === 'center' ? 'highlight' : ''}`;
                    }
                }
            });

            requestAnimationFrame(drawHeroGraph);
        }
    }

    // ============================================
    // 6. RIPPLE EFFECT INTERACTIVE DEMO
    // ============================================
    const rippleCanvas = document.getElementById('ripple-canvas');
    const rippleLabels = document.getElementById('ripple-labels');
    const rippleInfo = document.getElementById('ripple-info-inner');

    if (rippleCanvas && rippleLabels && rippleInfo) {
        const rctx = rippleCanvas.getContext('2d');
        let rw, rh;

        function resizeRipple() {
            const rect = rippleCanvas.parentElement.getBoundingClientRect();
            rippleCanvas.width = rect.width;
            rippleCanvas.height = rect.height;
            rw = rippleCanvas.width;
            rh = rippleCanvas.height;
        }
        resizeRipple();
        window.addEventListener('resize', resizeRipple);

        // Scenarios
        const scenarios = [
            {
                title: 'Musk leaves Tesla',
                nodes: [
                    { id: 'Musk Exits TSLA', x: 0.15, y: 0.35, type: 'event', hop: 0 },
                    { id: 'TSLA', x: 0.32, y: 0.25, type: 'direct', hop: 1, portfolio: true },
                    { id: 'TSLA Stock -18%', x: 0.32, y: 0.50, type: 'impact', hop: 1 },
                    { id: 'Panasonic (supplier)', x: 0.50, y: 0.15, type: 'supplier', hop: 2 },
                    { id: 'CATL Battery', x: 0.50, y: 0.45, type: 'supplier', hop: 2 },
                    { id: 'SpaceX contracts', x: 0.50, y: 0.70, type: 'related', hop: 2 },
                    { id: 'Maersk Shipping', x: 0.70, y: 0.25, type: 'indirect', hop: 3, portfolio: true },
                    { id: 'BHP Lithium', x: 0.70, y: 0.50, type: 'indirect', hop: 3 },
                    { id: 'Your: $SHIP', x: 0.85, y: 0.35, type: 'you', hop: 3, portfolio: true },
                ],
                edges: [[0,1],[0,2],[1,3],[1,4],[0,5],[3,6],[4,7],[6,8]],
                info: {
                    title: 'Musk Exits Tesla — 3-Hop Cascade',
                    desc: 'A leadership change at Tesla ripples through the supply chain. Parts suppliers reduce orders, shipping volumes drop, and your logistics holding ($SHIP) takes an indirect hit you\'d never see coming.',
                    path: ['Musk Exit', 'TSLA -18%', 'Panasonic orders ↓', 'Maersk volume ↓', 'Your: $SHIP']
                }
            },
            {
                title: 'China bans rare earth exports',
                nodes: [
                    { id: 'China Rare Earth Ban', x: 0.12, y: 0.40, type: 'event', hop: 0 },
                    { id: 'Rare Earth Prices ↑', x: 0.30, y: 0.20, type: 'direct', hop: 1 },
                    { id: 'EV Battery Costs ↑', x: 0.30, y: 0.55, type: 'impact', hop: 1 },
                    { id: 'TSLA margins ↓', x: 0.50, y: 0.18, type: 'supplier', hop: 2, portfolio: true },
                    { id: 'AAPL production ↓', x: 0.50, y: 0.42, type: 'supplier', hop: 2, portfolio: true },
                    { id: 'Defense stocks ↑', x: 0.50, y: 0.68, type: 'related', hop: 2 },
                    { id: 'MP Materials ↑', x: 0.72, y: 0.30, type: 'indirect', hop: 3 },
                    { id: 'Your: NVDA delays', x: 0.72, y: 0.55, type: 'you', hop: 3, portfolio: true },
                    { id: 'Lynas Mining ↑', x: 0.88, y: 0.42, type: 'indirect', hop: 3 },
                ],
                edges: [[0,1],[0,2],[1,3],[2,4],[1,5],[3,6],[4,7],[6,8]],
                info: {
                    title: 'China Bans Rare Earth Exports — Supply Chain Shock',
                    desc: 'A geopolitical move in China cascades through EV batteries, smartphone production, and chip manufacturing. Your NVDA position faces production delays through TSMC\'s material shortages.',
                    path: ['China Ban', 'Rare Earth ↑', 'Battery Costs ↑', 'TSMC delays', 'Your: NVDA']
                }
            },
            {
                title: 'Fed raises rates 50bps',
                nodes: [
                    { id: 'Fed +50bps', x: 0.12, y: 0.40, type: 'event', hop: 0 },
                    { id: 'Bond yields ↑', x: 0.30, y: 0.20, type: 'direct', hop: 1 },
                    { id: 'Growth stocks ↓', x: 0.30, y: 0.55, type: 'impact', hop: 1 },
                    { id: 'NVDA P/E compression', x: 0.50, y: 0.15, type: 'supplier', hop: 2, portfolio: true },
                    { id: 'Housing starts ↓', x: 0.50, y: 0.42, type: 'related', hop: 2 },
                    { id: 'USD strengthens', x: 0.50, y: 0.68, type: 'related', hop: 2 },
                    { id: 'AMZN cloud spend ↓', x: 0.72, y: 0.28, type: 'indirect', hop: 3, portfolio: true },
                    { id: 'EM currencies ↓', x: 0.72, y: 0.55, type: 'indirect', hop: 3 },
                    { id: 'Your: AAPL intl rev ↓', x: 0.88, y: 0.42, type: 'you', hop: 3, portfolio: true },
                ],
                edges: [[0,1],[0,2],[2,3],[1,4],[1,5],[3,6],[5,7],[7,8]],
                info: {
                    title: 'Fed Raises Rates — Macro Ripple Effect',
                    desc: 'A rate hike compresses growth stock valuations, strengthens the dollar, and reduces international revenue for your AAPL position — a connection most retail investors completely miss.',
                    path: ['Fed +50bps', 'USD ↑', 'EM currencies ↓', 'Int\'l revenue ↓', 'Your: AAPL']
                }
            }
        ];

        let currentScenario = 0;
        let activeNode = -1;
        let rippleWaves = [];
        let revealedHops = new Set([0]);
        let animating = false;

        function buildLabels() {
            rippleLabels.innerHTML = '';
            const nodes = scenarios[currentScenario].nodes;
            nodes.forEach((node, i) => {
                const label = document.createElement('div');
                label.className = `ripple-node-label ${node.type === 'you' || node.portfolio ? 'portfolio' : ''}`;
                label.textContent = node.id;
                label.style.left = (node.x * rw) + 'px';
                label.style.top = (node.y * rh) + 'px';
                label.style.opacity = node.hop === 0 ? '1' : '0';
                label.style.transform = `translate(-50%, -50%) scale(${node.hop === 0 ? 1 : 0.8})`;
                label.dataset.index = i;
                label.addEventListener('click', () => triggerRipple(i));
                rippleLabels.appendChild(label);
            });
        }

        function triggerRipple(nodeIdx) {
            const scenario = scenarios[currentScenario];
            const node = scenario.nodes[nodeIdx];

            // Mark active
            activeNode = nodeIdx;

            // Start ripple wave
            rippleWaves.push({
                x: node.x * rw,
                y: node.y * rh,
                r: 0,
                maxR: Math.max(rw, rh),
                alpha: 0.4,
                hop: node.hop
            });

            // Reveal next hop
            const nextHop = node.hop + 1;
            const maxHop = Math.max(...scenario.nodes.map(n => n.hop));

            // Cascade reveal
            let delay = 0;
            for (let h = 0; h <= maxHop; h++) {
                setTimeout(() => {
                    revealedHops.add(h);
                    updateLabelVisibility();
                }, delay);
                delay += 400;
            }

            // Update info panel
            const info = scenario.info;
            rippleInfo.innerHTML = `
                <span class="ripple-info-tag">RIPPLE ANALYSIS — ${node.hop + 1}-HOP CASCADE</span>
                <div class="ripple-info-title">${info.title}</div>
                <div class="ripple-info-desc">${info.desc}</div>
                <div class="ripple-info-path">
                    ${info.path.map((p, i) =>
                        `<span class="rip-path-node ${i === 0 ? 'origin' : ''} ${i === info.path.length - 1 ? 'yours' : ''}">${p}</span>` +
                        (i < info.path.length - 1 ? '<span class="rip-path-arrow">&rarr;</span>' : '')
                    ).join('')}
                </div>
            `;

            // Highlight active label
            const labels = rippleLabels.children;
            for (let i = 0; i < labels.length; i++) {
                if (i === nodeIdx) labels[i].classList.add('active');
                else labels[i].classList.remove('active');
            }
        }

        function updateLabelVisibility() {
            const scenario = scenarios[currentScenario];
            const labels = rippleLabels.children;
            for (let i = 0; i < labels.length; i++) {
                const node = scenario.nodes[i];
                if (revealedHops.has(node.hop)) {
                    labels[i].style.opacity = '1';
                    labels[i].style.transform = 'translate(-50%, -50%) scale(1)';
                    if (node.type === 'you' || node.portfolio) {
                        labels[i].classList.add('affected');
                    }
                }
            }
        }

        function switchScenario(idx) {
            currentScenario = idx;
            activeNode = -1;
            revealedHops = new Set([0]);
            rippleWaves = [];
            buildLabels();
            rippleInfo.innerHTML = '<span class="ripple-info-tag">Click a node to explore the cascade</span>';

            // Update buttons
            document.querySelectorAll('.ripple-btn').forEach((btn, i) => {
                btn.classList.toggle('active', i === idx);
            });
        }

        // Scenario buttons
        document.querySelectorAll('.ripple-btn').forEach(btn => {
            btn.addEventListener('click', () => switchScenario(parseInt(btn.dataset.scenario)));
        });

        let rippleRunning = false;
        const rippleObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                rippleRunning = entry.isIntersecting;
                if (rippleRunning) { resizeRipple(); buildLabels(); drawRipple(); }
            });
        }, { threshold: 0.2 });
        rippleObserver.observe(rippleCanvas);

        function drawRipple() {
            if (!rippleRunning) return;

            rctx.clearRect(0, 0, rw, rh);

            const scenario = scenarios[currentScenario];
            const nodes = scenario.nodes;
            const edges = scenario.edges;

            // Draw edges
            edges.forEach(([a, b]) => {
                if (!revealedHops.has(nodes[a].hop) || !revealedHops.has(nodes[b].hop)) return;

                const ax = nodes[a].x * rw, ay = nodes[a].y * rh;
                const bx = nodes[b].x * rw, by = nodes[b].y * rh;

                rctx.beginPath();
                rctx.moveTo(ax, ay);
                rctx.lineTo(bx, by);

                const isActive = (a === activeNode || b === activeNode);
                rctx.strokeStyle = isActive ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.1)';
                rctx.lineWidth = isActive ? 1.5 : 0.8;
                rctx.stroke();

                // Animated pulse along edge
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

            // Draw nodes
            nodes.forEach((node, i) => {
                if (!revealedHops.has(node.hop)) return;

                const x = node.x * rw;
                const y = node.y * rh;
                const size = node.type === 'event' ? 10 : node.type === 'you' ? 9 : 6;

                // Glow for special nodes
                if (node.type === 'event' || node.type === 'you') {
                    rctx.beginPath();
                    rctx.arc(x, y, size + 12, 0, Math.PI * 2);
                    rctx.fillStyle = `rgba(212, 175, 55, ${0.06 + Math.sin(Date.now() * 0.003) * 0.03})`;
                    rctx.fill();
                }

                rctx.beginPath();
                rctx.arc(x, y, size, 0, Math.PI * 2);
                const alpha = node.type === 'event' ? 0.9 : node.type === 'you' ? 0.8 : node.portfolio ? 0.5 : 0.3;
                rctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
                rctx.fill();
            });

            // Draw ripple waves
            rippleWaves = rippleWaves.filter(w => w.alpha > 0.01);
            rippleWaves.forEach(wave => {
                wave.r += 3;
                wave.alpha *= 0.98;
                rctx.beginPath();
                rctx.arc(wave.x, wave.y, wave.r, 0, Math.PI * 2);
                rctx.strokeStyle = `rgba(212, 175, 55, ${wave.alpha})`;
                rctx.lineWidth = 1;
                rctx.stroke();
            });

            // Update label positions on resize
            const labels = rippleLabels.children;
            for (let i = 0; i < labels.length && i < nodes.length; i++) {
                labels[i].style.left = (nodes[i].x * rw) + 'px';
                labels[i].style.top = (nodes[i].y * rh) + 'px';
            }

            requestAnimationFrame(drawRipple);
        }
    }

    // ============================================
    // 7. COUNTER ANIMATION
    // ============================================
    document.querySelectorAll('[data-count]').forEach(el => {
        const cObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseFloat(el.dataset.count);
                    const duration = 2000;
                    const start = performance.now();
                    function update(now) {
                        const elapsed = now - start;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        const current = target * eased;
                        if (target >= 100) el.textContent = Math.floor(current).toLocaleString();
                        else if (target >= 10) el.textContent = Math.floor(current);
                        else el.textContent = current.toFixed(target % 1 !== 0 ? 2 : 0);
                        if (progress < 1) requestAnimationFrame(update);
                    }
                    requestAnimationFrame(update);
                    cObserver.unobserve(el);
                }
            });
        }, { threshold: 0.5 });
        cObserver.observe(el);
    });

    // ============================================
    // 8. DAILY BRIEF INSIGHT ANIMATION
    // ============================================
    const insightEl = document.getElementById('mockup-insight-1');
    if (insightEl) {
        const insightObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    insightEl.style.borderLeft = '3px solid var(--amber)';
                    insightEl.style.background = 'rgba(212,175,55,0.03)';
                    insightObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        insightObserver.observe(insightEl);
    }

    // ============================================
    // 9. SMOOTH ANCHORS
    // ============================================
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
        });
    });

    // ============================================
    // 10. PAGE LOAD
    // ============================================
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.6s ease';
    window.addEventListener('load', () => {
        document.body.style.opacity = '1';
        document.querySelectorAll('[data-reveal]').forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight) {
                const delay = parseInt(el.dataset.delay || 0);
                setTimeout(() => el.classList.add('revealed'), delay);
            }
        });
    });

})();
