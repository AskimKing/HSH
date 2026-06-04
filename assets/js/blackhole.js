(function () {
    if (typeof THREE === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;';
    document.body.insertBefore(canvas, document.body.firstChild);

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { canvas.remove(); return; }

    const scene    = new THREE.Scene();
    const camera   = new THREE.Camera();
    const uniforms = {
        u_res:    { value: new THREE.Vector2() },
        u_time:   { value: 0.0 },
        u_mouse:  { value: new THREE.Vector2(0.5, 0.5) },
        u_scroll: { value: 0.0 },
    };

    const VERT = `void main(){ gl_Position = vec4(position, 1.0); }`;

    const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_scroll;

/* ── Noise ──────────────────────────────────────────────────────────── */
float hash(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){
    vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){
    float v=0.0,a=0.5;
    mat2 r=mat2(0.8,-0.6,0.6,0.8);
    for(int i=0;i<8;i++){v+=a*vnoise(p);p=r*p*2.0;a*=0.46;}
    return v;
}
float cNoise(vec2 p,float t){
    vec2 q=vec2(fbm(p+vec2(t*0.08,t*0.05)),
                fbm(p+vec2(t*0.06,-t*0.07)+vec2(5.2,1.3)));
    return fbm(p+2.5*q);
}

/* ── Stars ──────────────────────────────────────────────────────────── */
float starLayer(vec2 uv,float den,float seed){
    vec2 g=floor(uv*den),f=fract(uv*den)-0.5;
    float h=hash(g+seed);
    if(h<0.972) return 0.0;
    float tw=0.5+0.5*sin(u_time*(1.5+3.0*h)+h*6.28);
    return (1.0-smoothstep(0.0,0.38,length(f)))*tw*((h-0.972)/0.028);
}

/* ── 3D Volumetric cloud ─────────────────────────────────────────────
   4-step ray-march along light direction to accumulate shadow depth.
   Result: strong lit/shadow contrast, pronounced interior occlusion,
   bright rim back-scatter at every feathered edge.                  */
vec4 cloudVol(vec2 p, float t,
              vec3 litCol, vec3 shadowCol,
              float lo, float hi, float opacity){

    float den = cNoise(p, t);
    float alpha = smoothstep(lo, hi, den);
    if(alpha < 0.004) return vec4(0.0);

    /* Light direction: upper-left (matches reference) */
    vec2 ld = normalize(vec2(-0.22, 0.52));
    float step = 0.07;

    /* 4-step volumetric shadow accumulation */
    float shadowAcc = 0.0;
    shadowAcc += cNoise(p + ld*step*1.0, t) * 0.40;
    shadowAcc += cNoise(p + ld*step*2.0, t) * 0.30;
    shadowAcc += cNoise(p + ld*step*3.0, t) * 0.20;
    shadowAcc += cNoise(p + ld*step*4.0, t) * 0.10;

    /* How lit is this point: less shadow above = more lit */
    float lit = 1.0 - smoothstep(lo-0.05, hi+0.18, shadowAcc);

    /* Fake ambient occlusion in crevices (density curvature) */
    float ao = 1.0 - smoothstep(lo+0.02, hi+0.20, den) * 0.70;

    /* Rim back-scatter: thin edges lit from behind */
    float edge = 1.0 - smoothstep(lo, lo+0.12, den);
    float rim  = pow(edge, 2.5) * alpha * 1.8;

    /* Subsurface glow: very thin cloud lets light bleed through */
    float thin  = exp(-alpha * 4.0);
    vec3  sss   = litCol * thin * 0.40;

    /* Compose: shadow → lit face → ao → rim → sss */
    vec3 col = mix(shadowCol * ao, litCol * ao, lit);
    col += litCol * 2.0 * rim * 0.45;
    col += sss;

    return vec4(col, alpha * opacity);
}

void main(){
    vec2 uv=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);
    float t  = u_time*0.065;
    float sd = u_scroll*0.16;

    /* ── Deep navy space ────────────────────────────────────────────── */
    float bgD = length(uv*vec2(0.8,1.0));
    vec3 col = mix(vec3(0.02,0.03,0.12),vec3(0.00,0.00,0.03),smoothstep(0.0,1.3,bgD));

    /* ── Stars — very visible through the transparent clouds ─────────── */
    col += starLayer(uv, 50.0,0.0)*vec3(0.88,0.93,1.00)*0.70;
    col += starLayer(uv, 88.0,1.9)*vec3(1.00,0.93,0.88)*0.60;
    col += starLayer(uv,138.0,3.3)*vec3(0.82,0.87,1.00)*0.40;
    col += starLayer(uv,200.0,5.1)*vec3(0.90,0.90,1.00)*0.25;

    /* ── Warm galaxy glow at bottom-centre ───────────────────────────── */
    float gd=length(uv-vec2(0.05,-0.30));
    col += vec3(0.95,0.78,0.38)*exp(-gd*2.6)*0.36;
    col += vec3(0.60,0.40,0.80)*exp(-gd*4.5)*0.18;

    /* ── Layer 1: distant haze — very transparent, blue-violet ──────── */
    vec4 L1=cloudVol(
        uv*0.48+vec2(t*0.08,t*0.03-sd), t,
        vec3(0.50,0.66,0.94),  /* lit  sky-blue   */
        vec3(0.14,0.08,0.36),  /* shad deep-navy  */
        0.46,0.68, 0.16);
    col=mix(col,L1.rgb,L1.a);

    /* ── Layer 2: main cumulus — strong depth, bright lit crown ─────── */
    vec4 L2=cloudVol(
        uv*0.75+vec2(0.22,-0.04)+vec2(-t*0.07,t*0.045-sd*1.1), t,
        vec3(0.78,0.91,1.00),  /* lit  white-blue */
        vec3(0.26,0.13,0.54),  /* shad violet     */
        0.43,0.64, 0.22);
    col=mix(col,L2.rgb,L2.a);

    /* ── Layer 3: mid-ground — offset, slightly different scale ──────── */
    vec4 L3=cloudVol(
        uv*0.92+vec2(-0.18,0.06)+vec2(t*0.09,-t*0.038-sd*0.95), t,
        vec3(0.82,0.92,1.00),  /* lit  near-white */
        vec3(0.32,0.18,0.60),  /* shad lavender   */
        0.44,0.65, 0.18);
    col=mix(col,L3.rgb,L3.a);

    /* ── Layer 4: foreground — closest, most detailed ────────────────── */
    vec4 L4=cloudVol(
        uv*1.08+vec2(-0.35,0.12)+vec2(t*0.11,-t*0.042-sd*0.85), t,
        vec3(0.88,0.95,1.00),  /* lit  bright-white */
        vec3(0.36,0.20,0.64),  /* shad purple-grey  */
        0.45,0.65, 0.20);
    col=mix(col,L4.rgb,L4.a);

    /* ── Layer 5: purple accent (right) — like magenta clouds in ref ── */
    vec4 L5=cloudVol(
        uv*0.65+vec2(-0.48,0.09)+vec2(-t*0.055,t*0.065-sd*1.2), t,
        vec3(0.72,0.54,0.94),  /* lit  lavender   */
        vec3(0.22,0.05,0.40),  /* shad deep-plum  */
        0.44,0.65, 0.15);
    col=mix(col,L5.rgb,L5.a);

    /* ── High cirrus wisps — barely there ────────────────────────────── */
    float wisp=fbm(uv*1.8+vec2(t*0.14,-t*0.028-sd*0.55)+vec2(3.3,2.1));
    col=mix(col,vec3(0.78,0.85,0.98),smoothstep(0.53,0.66,wisp)*0.10);

    /* ── Vignette ────────────────────────────────────────────────────── */
    col*=1.0-smoothstep(0.52,1.28,length(uv*vec2(0.9,1.0)));

    /* ── Tone map + gamma ─────────────────────────────────────────────── */
    col=col/(col+0.68);
    col=pow(clamp(col,0.0,1.0),vec3(0.88));

    gl_FragColor=vec4(col,1.0);
}`;

    scene.add(new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG })
    ));

    function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h, false);
        uniforms.u_res.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    }
    window.addEventListener('resize', resize);
    resize();

    window.addEventListener('pointermove', e => {
        uniforms.u_mouse.value.set(
            e.clientX / window.innerWidth,
            1.0 - e.clientY / window.innerHeight
        );
    });

    let scrollTarget = 0, scrollSmooth = 0;
    function updateScroll() {
        const max = document.body.scrollHeight - window.innerHeight;
        scrollTarget = max > 0 ? Math.min(window.scrollY / max, 1.0) : 0;
    }
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    const t0 = performance.now();
    (function loop(now) {
        scrollSmooth += (scrollTarget - scrollSmooth) * 0.04;
        uniforms.u_scroll.value = scrollSmooth;
        uniforms.u_time.value   = (now - t0) / 1000;
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    })(performance.now());
})();
