import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createElfModel, type HeroPose } from './model';

export class HeroPreview {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-2.8, 2.8, 2.8, -2.8, .1, 80);
  private controls: OrbitControls;
  private hero = createElfModel();
  private flying = false;
  private pose: HeroPose = 'idle';
  private lastTime = 0;
  private poseStarted=0;
  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.scene.background = new THREE.Color('#e8e3d7');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', '艾莉娅三维体素模型，可拖动旋转');
    host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#aaa394', 1.4));
    const sun = new THREE.DirectionalLight('#fff9ec', 1.9); sun.position.set(-4, 8, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = .018; sun.shadow.bias = -.0001;
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4 }); this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#fff9f3',.8);fill.position.set(0,3,8);this.scene.add(fill);
    const rim = new THREE.DirectionalLight('#e9f5ff', .85); rim.position.set(4, 4, -5); this.scene.add(rim);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.50, .10, 48), new THREE.MeshStandardMaterial({ color: '#d4d0c3', roughness: .9 }));
    pedestal.position.y = -.08; pedestal.receiveShadow = true; this.scene.add(pedestal);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.40, .008, 4, 64), new THREE.MeshBasicMaterial({ color: '#99ad9d' })); ring.rotation.x = Math.PI / 2; ring.position.y = -.025; this.scene.add(ring);
    this.scene.add(this.hero.root);
    this.camera.position.set(3.5, 3.0, 8.5); this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 2.12, 0); this.controls.enablePan = false; this.controls.enableDamping = true;
    this.controls.minZoom = .75; this.controls.maxZoom = 2.4; this.controls.maxPolarAngle = Math.PI * .65; this.controls.minPolarAngle = .4;
    this.controls.update();
  }
  face(angle: number) {
    this.controls.enableDamping = false; this.controls.update();
    this.camera.position.set(Math.sin(angle) * 9, 2.12, Math.cos(angle) * 9);
    this.controls.target.set(0, 2.12, 0); this.controls.update(); this.controls.enableDamping = true;
  }
  setPose(pose: HeroPose) { this.pose = pose; this.poseStarted=this.lastTime; }
  toggleFlight() { this.flying = !this.flying; return this.flying; }
  render(time: number) {
    const width = this.host.clientWidth, height = this.host.clientHeight; if (!width || !height) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x !== width || size.y !== height) { this.renderer.setSize(width, height, false); const aspect=width/height, extent=Math.max(2.35,1.60/aspect); this.camera.left=-extent*aspect; this.camera.right=extent*aspect; this.camera.top=extent; this.camera.bottom=-extent; this.camera.updateProjectionMatrix(); }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dt = Math.min(.05, Math.max(0, time - this.lastTime)); this.lastTime = time;
    this.hero.animate(reduced ? 0 : time, this.flying||this.pose==='cast'||this.pose==='enter'&&time-this.poseStarted<.9, dt, reduced, this.pose,reduced?1:this.pose==='shoot'||this.pose==='melee'?(time-this.poseStarted)%.95:time-this.poseStarted);
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
}
