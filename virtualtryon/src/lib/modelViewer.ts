/**
 * Thin three.js wrapper for rendering a user-uploaded glTF/GLB model, shared
 * by the Preview-mode viewer and the Try-On tracking overlay. three.js is
 * loaded via dynamic import() — like face-api.js and MediaPipe elsewhere in
 * this app — so its bundle only downloads once a model is actually uploaded.
 */

export interface InstanceTransform {
  /** Anchor position in canvas pixel space. */
  x: number;
  y: number;
  /** On-screen width of the model's longest dimension, in canvas pixels. */
  size: number;
  rotationY?: number;
}

export interface ModelViewerHandle {
  /** Applies a flat tint to every material on the model, or null to restore its original colors/textures. */
  setTint(hex: string | null): void;
  /** Positions N instances of the model (e.g. two for a pair of earrings), adding/removing clones as needed. */
  setInstances(transforms: InstanceTransform[]): void;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}

export async function loadModelViewer(canvas: HTMLCanvasElement, url: string): Promise<ModelViewerHandle> {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 10;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a46, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2, 3, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(-3, -1, 4);
  scene.add(fill);

  const gltf = await new GLTFLoader().loadAsync(url);
  const template = gltf.scene;

  // Center and normalize so the model's longest dimension is exactly 1 unit;
  // an instance's `size` (px) then directly becomes its on-screen width,
  // since the orthographic camera below maps 1 world unit to 1 canvas pixel.
  const box = new THREE.Box3().setFromObject(template);
  const dimensions = new THREE.Vector3();
  box.getSize(dimensions);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;
  template.position.sub(center);

  const materials: import('three').Material[] = [];
  const baseColors: (import('three').Color | null)[] = [];
  template.traverse((obj) => {
    const mesh = obj as import('three').Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh) return;
    const original = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const cloned = original.clone();
    mesh.material = cloned;
    materials.push(cloned);
    const colorable = cloned as import('three').MeshStandardMaterial;
    baseColors.push(colorable.color ? colorable.color.clone() : null);
  });

  const normalized = new THREE.Group();
  normalized.scale.setScalar(1 / maxDim);
  normalized.add(template);

  // Each instance is an outer group (position/size/rotation, set per-frame
  // in setInstances) wrapping a clone of the intrinsically-normalized
  // template, so the two scale factors don't collide on the same node.
  const instances: import('three').Group[] = [];

  function setInstanceCount(count: number) {
    while (instances.length < count) {
      const outer = new THREE.Group();
      outer.add(normalized.clone(true));
      scene.add(outer);
      instances.push(outer);
    }
    while (instances.length > count) {
      const extra = instances.pop();
      if (extra) scene.remove(extra);
    }
  }

  let width = 1;
  let height = 1;

  return {
    setTint(hex) {
      materials.forEach((material, i) => {
        const colorable = material as import('three').MeshStandardMaterial;
        if (!colorable.color) return;
        const base = baseColors[i];
        if (hex) colorable.color.set(hex);
        else if (base) colorable.color.copy(base);
      });
    },
    setInstances(transforms) {
      setInstanceCount(transforms.length);
      transforms.forEach((t, i) => {
        const group = instances[i];
        group.position.set(t.x - width / 2, -(t.y - height / 2), 0);
        group.scale.setScalar(t.size);
        group.rotation.y = t.rotationY ?? 0;
      });
    },
    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setSize(width, height, false);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      instances.forEach((g) => scene.remove(g));
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
