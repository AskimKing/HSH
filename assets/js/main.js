// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar scroll effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 50) {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections for animation
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// Add loading animation on page load
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

function acceptCookies() {
        document.getElementById('cookieBanner').style.display = 'none';
        localStorage.setItem('cookiesAccepted', 'true');
    }

    // Check if consent already given
    window.onload = function() {
        if (localStorage.getItem('cookiesAccepted') === 'true') {
            document.getElementById('cookieBanner').style.display = 'none';
        }
    };

// ========================================
// Perlin Noise Implementation
// ========================================


class PerlinNoise {
    constructor() {
        this.permutation = [];
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }
        // Shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        // Duplicate
        this.p = [...this.permutation, ...this.permutation];
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);

        const u = this.fade(x);
        const v = this.fade(y);

        const a = this.p[X] + Y;
        const b = this.p[X + 1] + Y;

        return this.lerp(v,
            this.lerp(u, this.grad(this.p[a], x, y), this.grad(this.p[b], x - 1, y)),
            this.lerp(u, this.grad(this.p[a + 1], x, y - 1), this.grad(this.p[b + 1], x - 1, y - 1))
        );
    }
}

// ========================================
// Particle Network System - Connected Dots Animation
// ========================================

class ParticleNetwork {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];

        // Reduce particle count on mobile for better performance
        this.isMobile = window.innerWidth <= 768;
        this.particleCount = this.isMobile ? 40 : 100;
        this.maxDistance = this.isMobile ? 100 : 150;

        this.mouse = {
            x: null,
            y: null,
            radius: this.isMobile ? 120 : 180
        };
        this.perlin = new PerlinNoise();
        this.time = 0;
        this.noiseScale = 0.003;
        this.noiseStrength = 0.5;

        console.log('ParticleNetwork constructor called');
        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        console.log('Mobile mode:', this.isMobile, 'Particle count:', this.particleCount);

        this.setupEventListeners();
        this.resize();
        this.init();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Update mobile detection and particle count on resize
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        if (wasMobile !== this.isMobile) {
            this.particleCount = this.isMobile ? 40 : 100;
            this.maxDistance = this.isMobile ? 100 : 150;
            this.mouse.radius = this.isMobile ? 120 : 180;
        }

        this.init(); // Reinitialize particles after resize
    }

    init() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                baseX: Math.random() * this.canvas.width,
                baseY: Math.random() * this.canvas.height,
                noiseOffsetX: Math.random() * 1000,
                noiseOffsetY: Math.random() * 1000,
                radius: Math.random() * 2 + 1
            });
        }
        console.log(`Initialized ${this.particles.length} particles with Perlin noise`);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });
    }

    drawParticles() {
        this.particles.forEach(particle => {
            // Use Perlin noise for smooth, organic movement
            const noiseX = this.perlin.noise(
                (particle.baseX + this.time) * this.noiseScale + particle.noiseOffsetX,
                particle.noiseOffsetY
            );
            const noiseY = this.perlin.noise(
                particle.noiseOffsetX,
                (particle.baseY + this.time) * this.noiseScale + particle.noiseOffsetY
            );

            // Apply noise to position with wrapping
            const moveRange = 50;
            particle.x = particle.baseX + noiseX * moveRange * this.noiseStrength;
            particle.y = particle.baseY + noiseY * moveRange * this.noiseStrength;

            // Wrap around edges
            if (particle.x < -moveRange) particle.baseX = this.canvas.width + moveRange;
            if (particle.x > this.canvas.width + moveRange) particle.baseX = -moveRange;
            if (particle.y < -moveRange) particle.baseY = this.canvas.height + moveRange;
            if (particle.y > this.canvas.height + moveRange) particle.baseY = -moveRange;

            // Mouse interaction (repulsion)
            if (this.mouse.x !== null && this.mouse.y !== null) {
                const dx = this.mouse.x - particle.x;
                const dy = this.mouse.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.mouse.radius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (this.mouse.radius - distance) / this.mouse.radius;

                    particle.baseX -= Math.cos(angle) * force * 3;
                    particle.baseY -= Math.sin(angle) * force * 3;
                }
            }

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
            this.ctx.fill();
        });
    }

    connectParticles() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.maxDistance) {
                    const opacity = (1 - distance / this.maxDistance) * 0.5;
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }

            // Connect to mouse
            if (this.mouse.x !== null && this.mouse.y !== null) {
                const dx = this.mouse.x - this.particles[i].x;
                const dy = this.mouse.y - this.particles[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.mouse.radius) {
                    const opacity = (1 - distance / this.mouse.radius) * 0.8;
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(255, 0, 128, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    this.ctx.stroke();

                    // Draw larger glow at mouse
                    this.ctx.beginPath();
                    this.ctx.arc(this.particles[i].x, this.particles[i].y, this.particles[i].radius * 2, 0, Math.PI * 2);
                    this.ctx.fillStyle = `rgba(255, 0, 128, ${opacity * 0.5})`;
                    this.ctx.fill();
                }
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.connectParticles();
        this.drawParticles();

        // Increment time for Perlin noise animation (3x faster: 0.5 -> 1.5)
        this.time += 1.5;

        requestAnimationFrame(() => this.animate());
    }
}

// ========================================
// Interactive Background System - Ready Player One Style
// ========================================

class InteractiveBackground {
    constructor() {
        this.particles = document.querySelectorAll('.particle');
        this.glitchOverlay = document.querySelector('.glitch-overlay');
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        this.scrollY = 0;
        this.cursorParticles = [];
        this.isActive = false;
        this.init();
    }

    init() {
        console.log('%c🎮 HighScoreHunt Interactive Background Initialized', 'color: #00d4ff; font-size: 14px; font-weight: bold;');
        console.log('%cFeatures Active:', 'color: #ff0080; font-weight: bold;');
        console.log('  ✓ Mouse Parallax Effect');
        console.log('  ✓ Cursor Trail Particles');
        console.log('  ✓ Click Ripple Effects');
        console.log('  ✓ Scroll Parallax');
        console.log('  ✓ Konami Code Easter Egg (↑↑↓↓←→←→BA)');

        this.setupMouseTracking();
        this.setupScrollEffects();
        this.createCursorParticles();
        this.animateParticles();
        this.setupClickEffects();

        // Mark as active
        this.isActive = true;
        document.body.setAttribute('data-bg-active', 'true');
    }

    setupMouseTracking() {
        let mouseTimeout;

        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            // Move existing particles based on mouse position
            this.particles.forEach((particle, index) => {
                const speed = (index + 1) * 0.06;
                const offsetX = (this.mouseX - window.innerWidth / 2) * speed;
                const offsetY = (this.mouseY - window.innerHeight / 2) * speed;

                particle.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            });

            // Create cursor trail particle
            clearTimeout(mouseTimeout);
            mouseTimeout = setTimeout(() => {
                this.createCursorTrail(e.clientX, e.clientY);
            }, 50);
        });
    }

    createCursorTrail(x, y) {
        const trail = document.createElement('div');
        trail.className = 'cursor-trail';
        trail.style.left = x + 'px';
        trail.style.top = y + 'px';

        const bgParticles = document.querySelector('.bg-particles');
        if (bgParticles) {
            bgParticles.appendChild(trail);
            setTimeout(() => trail.remove(), 1000);
        }
    }

    setupScrollEffects() {
        let ticking = false;

        window.addEventListener('scroll', () => {
            this.scrollY = window.pageYOffset;

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.updateScrollEffects();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    updateScrollEffects() {
        // Parallax effect on particles based on scroll
        this.particles.forEach((particle, index) => {
            const speed = (index % 3 + 1) * 0.3;
            const yOffset = this.scrollY * speed;
            const currentTransform = particle.style.transform || '';

            // Preserve mouse offset and add scroll offset
            if (currentTransform) {
                particle.style.transform = currentTransform + ` translateY(${-yOffset}px)`;
            }
        });

        // Trigger glitch effect on certain scroll positions
        if (this.scrollY % 500 < 10) {
            this.triggerGlitch();
        }
    }

    createCursorParticles() {
        const bgParticles = document.querySelector('.bg-particles');
        if (!bgParticles) return;

        for (let i = 0; i < 3; i++) {
            const particle = document.createElement('div');
            particle.className = 'cursor-particle';
            bgParticles.appendChild(particle);
            this.cursorParticles.push(particle);
        }
    }

    animateParticles() {
        let angle = 0;

        const animate = () => {
            angle += 0.01;

            this.cursorParticles.forEach((particle, index) => {
                const offsetAngle = angle + (index * Math.PI * 2 / 3);
                const radius = 50 + Math.sin(angle * 2) * 20;
                const x = this.mouseX + Math.cos(offsetAngle) * radius;
                const y = this.mouseY + Math.sin(offsetAngle) * radius;

                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.opacity = 0.3 + Math.sin(angle * 3) * 0.2;
            });

            requestAnimationFrame(animate);
        };

        animate();
    }

    setupClickEffects() {
        document.addEventListener('click', (e) => {
            this.createRipple(e.clientX, e.clientY);
            this.triggerGlitch();
        });
    }

    createRipple(x, y) {
        const bgParticles = document.querySelector('.bg-particles');
        if (!bgParticles) return;

        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        bgParticles.appendChild(ripple);

        // Create multiple particles on click
        for (let i = 0; i < 8; i++) {
            this.createExplosionParticle(x, y, i);
        }

        setTimeout(() => ripple.remove(), 1000);
    }

    createExplosionParticle(x, y, index) {
        const bgParticles = document.querySelector('.bg-particles');
        if (!bgParticles) return;

        const particle = document.createElement('div');
        particle.className = 'explosion-particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';

        const angle = (Math.PI * 2 * index) / 8;
        const velocity = 100 + Math.random() * 50;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');

        bgParticles.appendChild(particle);
        setTimeout(() => particle.remove(), 1000);
    }

    triggerGlitch() {
        if (!this.glitchOverlay) return;

        this.glitchOverlay.style.animation = 'none';
        setTimeout(() => {
            this.glitchOverlay.style.animation = 'glitchFlash 0.3s ease-out';
        }, 10);
    }
}

// Initialize particle network with Perlin noise
const particleCanvas = document.getElementById('particleCanvas');
let particleNetwork = null;

if (particleCanvas) {
    particleNetwork = new ParticleNetwork(particleCanvas);
    console.log('%c🌐 Particle Network with Perlin Noise Initialized', 'color: #00d4ff; font-size: 14px; font-weight: bold;');
    console.log('  ✓ 100 Interactive Particles');
    console.log('  ✓ Perlin Noise Movement (Organic Flow)');
    console.log('  ✓ Dynamic Line Connections');
    console.log('  ✓ Mouse Repulsion Effect');
    console.log('  ✓ Polygon Formation');
}

// Initialize interactive background
const interactiveBg = new InteractiveBackground();

// Update status indicator when background is active
window.addEventListener('load', () => {
    const statusIndicator = document.getElementById('bgStatusIndicator');
    if (statusIndicator) {
        setTimeout(() => {
            statusIndicator.classList.add('active');
            // Auto-hide after 5 seconds
            setTimeout(() => {
                statusIndicator.style.opacity = '0';
                setTimeout(() => {
                    statusIndicator.style.display = 'none';
                }, 300);
            }, 5000);
        }, 500);
    }
});

// Add keyboard controls for easter eggs
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);

    if (konamiCode.join(',') === konamiSequence.join(',')) {
        activateMatrixMode();
    }
});

function activateMatrixMode() {
    const bgParticles = document.querySelector('.bg-particles');
    if (!bgParticles) return;

    document.body.classList.add('matrix-mode');

    // Create matrix rain effect
    for (let i = 0; i < 20; i++) {
        const column = document.createElement('div');
        column.className = 'matrix-column';
        column.style.left = Math.random() * 100 + '%';
        column.style.animationDelay = Math.random() * 2 + 's';
        bgParticles.appendChild(column);
    }

    setTimeout(() => {
        document.body.classList.remove('matrix-mode');
        document.querySelectorAll('.matrix-column').forEach(col => col.remove());
    }, 10000);
}

console.log('HighScoreHunt - Interactive Background Active');

// ========================================
// Letter-by-Letter Text Animation on Scroll
// ========================================

class TextAnimator {
    constructor() {
        this.animatedElements = [];
        this.init();
    }

    init() {
        // Select elements to animate
        const selectors = [
            '.section-title',
            '.hsh-finale-text'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                if (!element.hasAttribute('data-text-animated')) {
                    this.prepareElement(element);
                }
            });
        });

        // Add specific h3 elements (not all h3s, to avoid breaking emojis and inline styled elements)
        document.querySelectorAll('.game-card h3, .attendee-card h3, .rules-card h3, .hsh-finale-subtitle').forEach(element => {
            if (!element.hasAttribute('data-text-animated')) {
                this.prepareElement(element);
            }
        });

        this.setupObserver();
        console.log('%c✨ Letter-by-Letter Text Animation Initialized', 'color: #00d4ff; font-size: 14px; font-weight: bold;');
    }

    prepareElement(element) {
        element.setAttribute('data-text-animated', 'true');
        const text = element.textContent.trim();
        element.setAttribute('data-original-text', text);

        console.log(`Preparing element: ${element.tagName}.${element.className} with text: "${text.substring(0, 30)}..."`);

        // Split into spans for each character
        const spans = text.split('').map((char, index) => {
            if (char === ' ') {
                return `<span class="char-animate" style="animation-delay: ${index * 0.05}s">&nbsp;</span>`;
            }
            if (char === '\n') {
                return '<br>';
            }
            return `<span class="char-animate" style="animation-delay: ${index * 0.05}s">${char}</span>`;
        }).join('');

        element.innerHTML = spans;
        element.classList.add('text-animation-ready');
        this.animatedElements.push(element);

        console.log(`Element prepared with ${text.length} characters`);
    }

    setupObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('text-animated')) {
                    console.log(`🎬 Animating: ${entry.target.tagName}.${entry.target.className}`);
                    entry.target.classList.add('text-animated');
                }
            });
        }, observerOptions);

        console.log(`📊 Observing ${this.animatedElements.length} elements`);

        this.animatedElements.forEach(element => {
            observer.observe(element);

            // Check if element is already in viewport on page load - improved detection
            const rect = element.getBoundingClientRect();
            const isInViewport = (
                rect.top >= 0 &&
                rect.top <= window.innerHeight
            ) || (
                rect.bottom >= 0 &&
                rect.bottom <= window.innerHeight
            ) || (
                rect.top < 0 &&
                rect.bottom > window.innerHeight
            );

            console.log(`🔍 Element ${element.tagName}.${element.className} in viewport: ${isInViewport} (top: ${rect.top}, bottom: ${rect.bottom}, vh: ${window.innerHeight})`);

            if (isInViewport && !element.classList.contains('text-animated')) {
                // Animate immediately with a small delay to ensure DOM is ready
                console.log(`⚡ Immediately animating visible element: ${element.tagName}.${element.className}`);
                requestAnimationFrame(() => {
                    element.classList.add('text-animated');
                });
            }
        });
    }
}

// Initialize text animator after page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        const textAnimator = new TextAnimator();
    }, 100);
});
