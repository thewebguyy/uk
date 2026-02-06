/**
 * CMUK DIGITAL SYSTEM - 3D STUDIO ENGINE
 * Real-time product configuration and visualization
 * Dependencies: Three.js, OrbitControls, GLTFLoader
 */

class Studio3D {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    // Configuration
    this.config = {
      modelPath: options.modelPath || null,
      backgroundColor: 0xffffff,
      cameraDistance: 5,
      enableShadows: true,
      autoRotate: options.autoRotate || false,
      rotateSpeed: 0.5,
      ...options
    };

    // State
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
    this.lights = [];
    this.customizableObjects = new Map();
    this.isLoading = false;
    this.loadProgress = 0;

    this.init();
  }

  /**
   * Initialize 3D Studio
   */
  init() {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.createControls();
    this.setupEventListeners();
    this.animate();

    // Load model if path provided
    if (this.config.modelPath) {
      this.loadModel(this.config.modelPath);
    }

    // Emit ready event
    this.emit('studio:ready');
  }

  /**
   * Create Three.js scene
   */
  createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.backgroundColor);
    
    // Optional: Add grid helper for technical aesthetic
    if (this.config.showGrid) {
      const gridHelper = new THREE.GridHelper(10, 10, 0x000000, 0x94A3B8);
      gridHelper.material.opacity = 0.2;
      gridHelper.material.transparent = true;
      this.scene.add(gridHelper);
    }
  }

  /**
   * Create camera
   */
  createCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(
      this.config.cameraDistance,
      this.config.cameraDistance,
      this.config.cameraDistance
    );
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Create WebGL renderer
   */
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    if (this.config.enableShadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.container.appendChild(this.renderer.domElement);
  }

  /**
   * Create realistic lighting setup
   */
  createLights() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Key light (main directional light)
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(5, 10, 7.5);
    keyLight.castShadow = this.config.enableShadows;
    
    if (this.config.enableShadows) {
      keyLight.shadow.camera.left = -10;
      keyLight.shadow.camera.right = 10;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.camera.near = 0.1;
      keyLight.shadow.camera.far = 50;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.bias = -0.0001;
    }
    
    this.scene.add(keyLight);
    this.lights.push(keyLight);

    // Fill light (softer, opposite side)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);
    this.lights.push(fillLight);

    // Rim light (backlight for edge definition)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, 3, -10);
    this.scene.add(rimLight);
    this.lights.push(rimLight);

    // Optional: Add shadow plane
    if (this.config.enableShadows) {
      const planeGeometry = new THREE.PlaneGeometry(50, 50);
      const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.1 });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = -1;
      plane.receiveShadow = true;
      this.scene.add(plane);
    }
  }

  /**
   * Create orbit controls
   */
  createControls() {
    if (typeof THREE.OrbitControls === 'undefined') {
      console.warn('OrbitControls not loaded. Controls will be disabled.');
      return;
    }

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 1.5;
    this.controls.autoRotate = this.config.autoRotate;
    this.controls.autoRotateSpeed = this.config.rotateSpeed;
  }

  /**
   * Load 3D model (GLTF/GLB)
   */
  loadModel(modelPath) {
    if (typeof THREE.GLTFLoader === 'undefined') {
      console.error('GLTFLoader not loaded. Cannot load models.');
      this.emit('model:error', { error: 'GLTFLoader not available' });
      return;
    }

    this.isLoading = true;
    this.emit('model:loading:start');

    const loader = new THREE.GLTFLoader();
    
    loader.load(
      modelPath,
      (gltf) => this.onModelLoad(gltf),
      (xhr) => this.onLoadProgress(xhr),
      (error) => this.onLoadError(error)
    );
  }

  /**
   * Handle model load success
   */
  onModelLoad(gltf) {
    // Remove existing model if any
    if (this.model) {
      this.scene.remove(this.model);
    }

    this.model = gltf.scene;

    // Enable shadows for all meshes
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = this.config.enableShadows;
        child.receiveShadow = this.config.enableShadows;
        
        // Store reference for customization
        if (child.name) {
          this.customizableObjects.set(child.name, child);
        }
      }
    });

    // Center and scale model
    const box = new THREE.Box3().setFromObject(this.model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;

    this.model.scale.setScalar(scale);
    this.model.position.sub(center.multiplyScalar(scale));

    this.scene.add(this.model);

    this.isLoading = false;
    this.loadProgress = 100;
    this.emit('model:loaded', { model: this.model });
  }

  /**
   * Handle load progress
   */
  onLoadProgress(xhr) {
    if (xhr.lengthComputable) {
      this.loadProgress = (xhr.loaded / xhr.total) * 100;
      this.emit('model:loading:progress', { progress: this.loadProgress });
    }
  }

  /**
   * Handle load error
   */
  onLoadError(error) {
    console.error('Error loading model:', error);
    this.isLoading = false;
    this.emit('model:error', { error });
  }

  /**
   * Customize material color
   */
  setPartColor(partName, color) {
    const object = this.customizableObjects.get(partName);
    if (!object || !object.material) {
      console.warn(`Part "${partName}" not found or has no material`);
      return false;
    }

    object.material.color.set(color);
    this.emit('customization:changed', { part: partName, property: 'color', value: color });
    return true;
  }

  /**
   * Customize material
   */
  setPartMaterial(partName, properties) {
    const object = this.customizableObjects.get(partName);
    if (!object || !object.material) {
      console.warn(`Part "${partName}" not found or has no material`);
      return false;
    }

    Object.keys(properties).forEach(prop => {
      if (object.material[prop] !== undefined) {
        object.material[prop] = properties[prop];
      }
    });

    object.material.needsUpdate = true;
    this.emit('customization:changed', { part: partName, properties });
    return true;
  }

  /**
   * Get list of customizable parts
   */
  getCustomizableParts() {
    return Array.from(this.customizableObjects.keys());
  }

  /**
   * Reset camera position
   */
  resetCamera() {
    if (this.controls) {
      this.controls.reset();
    }
    this.emit('camera:reset');
  }

  /**
   * Toggle auto-rotation
   */
  toggleAutoRotate() {
    if (this.controls) {
      this.controls.autoRotate = !this.controls.autoRotate;
      this.emit('controls:autorotate', { enabled: this.controls.autoRotate });
    }
  }

  /**
   * Take screenshot
   */
  takeScreenshot() {
    return this.renderer.domElement.toDataURL('image/png');
  }

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.controls) {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Handle window resize
   */
  onResize() {
    if (!this.container) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    window.addEventListener('resize', () => this.onResize());
  }

  /**
   * Event emitter
   */
  emit(eventName, data = {}) {
    const event = new CustomEvent(eventName, { detail: data });
    this.container.dispatchEvent(event);
  }

  /**
   * Destroy studio instance
   */
  destroy() {
    if (this.controls) {
      this.controls.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }

    // Clean up scene
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.model = null;
  }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Studio3D;
}