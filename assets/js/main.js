// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Navbar scroll effect
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.pageYOffset > 50 ? '0 2px 10px rgba(0, 0, 0, 0.1)' : 'none';
});

// Intersection Observer for fade-in animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('section').forEach(section => observer.observe(section));

// Cookie Banner
function acceptCookies() {
    document.getElementById('cookieBanner').style.display = 'none';
    localStorage.setItem('cookiesAccepted', 'true');
}

window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    if (localStorage.getItem('cookiesAccepted') === 'true') {
        document.getElementById('cookieBanner').style.display = 'none';
    }
    setTimeout(() => new TextAnimator(), 100);
});

// ========================================
// Perlin Noise Implementation
// ========================================

class PerlinNoise {
    constructor() {
        this.permutation = [];
        for (let i = 0; i < 256; i++) this.permutation[i] = i;
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        this.p = [...this.permutation, ...this.permutation];
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y) {
        const h = hash & 3, u = h < 2 ? x : y, v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    noise(x, y) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        x -= Math.floor(x); y -= Math.floor(y);
        const u = this.fade(x), v = this.fade(y);
        const a = this.p[X] + Y, b = this.p[X + 1] + Y;
        return this.lerp(v,
            this.lerp(u, this.grad(this.p[a], x, y), this.grad(this.p[b], x - 1, y)),
            this.lerp(u, this.grad(this.p[a + 1], x, y - 1), this.grad(this.p[b + 1], x - 1, y - 1))
        );
    }
}

// ========================================
// Particle Network System
// ========================================

class ParticleNetwork {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.isMobile = window.innerWidth <= 768;
        this.particleCount = this.isMobile ? 40 : 100;
        this.maxDistance = this.isMobile ? 100 : 150;
        this.mouse = { x: null, y: null, radius: this.isMobile ? 120 : 180 };
        this.perlin = new PerlinNoise();
        this.time = 0;
        this.noiseScale = 0.003;
        this.noiseStrength = 0.5;
        this.setupEventListeners();
        this.resize();
        this.init();
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        if (wasMobile !== this.isMobile) {
            this.particleCount = this.isMobile ? 40 : 100;
            this.maxDistance = this.isMobile ? 100 : 150;
            this.mouse.radius = this.isMobile ? 120 : 180;
        }
        this.init();
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
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resize());
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
            const noiseX = this.perlin.noise(
                (particle.baseX + this.time) * this.noiseScale + particle.noiseOffsetX,
                particle.noiseOffsetY
            );
            const noiseY = this.perlin.noise(
                particle.noiseOffsetX,
                (particle.baseY + this.time) * this.noiseScale + particle.noiseOffsetY
            );
            const moveRange = 50;
            particle.x = particle.baseX + noiseX * moveRange * this.noiseStrength;
            particle.y = particle.baseY + noiseY * moveRange * this.noiseStrength;
            if (particle.x < -moveRange) particle.baseX = this.canvas.width + moveRange;
            if (particle.x > this.canvas.width + moveRange) particle.baseX = -moveRange;
            if (particle.y < -moveRange) particle.baseY = this.canvas.height + moveRange;
            if (particle.y > this.canvas.height + moveRange) particle.baseY = -moveRange;
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
        this.time += 1.5;
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize particle network
const particleCanvas = document.getElementById('particleCanvas');
if (particleCanvas) new ParticleNetwork(particleCanvas);

// ========================================
// Letter-by-Letter Text Animation on Scroll
// ========================================

class TextAnimator {
    constructor() {
        this.animatedElements = [];
        this.init();
    }

    init() {
        ['.section-title', '.hsh-finale-text'].forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (!el.hasAttribute('data-text-animated')) this.prepareElement(el);
            });
        });
        document.querySelectorAll('.game-card h3, .attendee-card h3, .rules-card h3, .hsh-finale-subtitle').forEach(el => {
            if (!el.hasAttribute('data-text-animated')) this.prepareElement(el);
        });
        this.setupObserver();
    }

    prepareElement(element) {
        element.setAttribute('data-text-animated', 'true');
        const text = element.textContent.trim();
        element.setAttribute('data-original-text', text);
        const spans = text.split('').map((char, index) => {
            if (char === ' ') return `<span class="char-animate" style="animation-delay: ${index * 0.05}s">&nbsp;</span>`;
            if (char === '\n') return '<br>';
            return `<span class="char-animate" style="animation-delay: ${index * 0.05}s">${char}</span>`;
        }).join('');
        element.innerHTML = spans;
        element.classList.add('text-animation-ready');
        this.animatedElements.push(element);
    }

    setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.classList.contains('text-animated')) {
                    entry.target.classList.add('text-animated');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px' });

        this.animatedElements.forEach(element => {
            observer.observe(element);
            const rect = element.getBoundingClientRect();
            const isInViewport = (rect.top >= 0 && rect.top <= window.innerHeight) ||
                                 (rect.bottom >= 0 && rect.bottom <= window.innerHeight) ||
                                 (rect.top < 0 && rect.bottom > window.innerHeight);
            if (isInViewport && !element.classList.contains('text-animated')) {
                requestAnimationFrame(() => element.classList.add('text-animated'));
            }
        });
    }
}
