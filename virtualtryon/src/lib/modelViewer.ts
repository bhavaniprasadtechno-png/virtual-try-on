/**
 * Thin three.js wrapper for rendering a user-uploaded glTF/GLB model, shared
 * by the Preview-mode viewer and the Try-On tracking overlay. three.js is
 * loaded via dynamic import() — like MediaPipe elsewhere in this app — so
 * its bundle only downloads once a model is actually uploaded.
 */

export interface InstanceTransform {
  /** Anchor position in canvas pixel space. */
  x: number;
  y: number;
  /** On-screen width of the model's longest dimension, in canvas pixels. */
  size: number;
  rotationX?: number;
  rotationY?: number;
  /** In-plane roll (radians) — matches ctx.rotate()'s screen-space convention, e.g. to track head tilt. */
  rotationZ?: number;
}

export interface ModelViewerHandle {
  /** Applies a flat tint to every material on the model, or null to restore its original colors/textures. */
  setTint(hex: string | null): void;
  /** Positions N instances of the model (e.g. two for a pair of earrings), adding/removing clones as needed. */
  setInstances(transforms: InstanceTransform[]): void;
  /**
   * Positions an invisible depth-only "head" proxy — a flattened ellipsoid,
   * not a sphere, since a sphere looks identical from every angle and
   * rotating one would be a no-op — behind the given transform, so parts
   * of the product model that fall behind it (e.g. a temple arm or lens at
   * extreme head yaw) are naturally hidden by the normal depth test instead
   * of rendering through the head. Pass null to disable (e.g. outside
   * Try-On, or for placements this isn't used for). Approximate/lite: not
   * real head geometry, just enough to avoid the worst self-intersection
   * at extreme angles.
   */
  setHeadOccluder(transform: InstanceTransform | null): void;
  /**
   * Same idea for necklace placement: an invisible depth-only vertical
   * cylinder standing in for the neck, positioned behind the necklace, so
   * the back arc of the loop — which a real neck would hide from a
   * front-facing camera — drops out via the normal depth test instead of
   * rendering through where the neck should be. Without this, an uploaded
   * necklace model's full closed loop is visible, which reads as a flat
   * medallion floating in front of the neck rather than wrapped around it.
   * Pass null to disable. Approximate/lite, same spirit as the head
   * occluder above.
   */
  setNeckOccluder(transform: InstanceTransform | null): void;
  resize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}

export async function loadModelViewer(canvas: HTMLCanvasElement, url: string): Promise<ModelViewerHandle> {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Without tone mapping, a shiny/metallic PBR material (common for glasses
  // frames and jewelry) can clip straight to solid white wherever a flat
  // face catches a direct specular highlight — ACES compresses that instead
  // of clipping it, so highlights read as bright, not as a blown-out patch.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  // Placeholder bounds/near/far — setInstances() rescales all of these to
  // fit the actual instance size before the first real frame (see below).
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.position.z = 10;

  // A soft procedural environment gives PBR materials realistic ambient
  // reflections instead of relying on a couple of hard directional lights,
  // which is what produces that harsh single-spot highlight in the first
  // place.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 0.6);
  key.position.set(2, 3, 5);
  scene.add(key);

  // Depth-only ("colorWrite: false") so it's invisible but still
  // participates in the normal depth test — geometry behind it gets
  // occluded the same way any other opaque geometry would be. A flattened
  // ellipsoid (non-uniform scale, applied per-call in setHeadOccluder),
  // not a plain sphere.
  const occluder = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 16),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }),
  );
  occluder.visible = false;
  scene.add(occluder);

  // Same depth-only trick, shaped as a vertical cylinder standing in for
  // the neck rather than a flattened sphere standing in for the head — see
  // setNeckOccluder below.
  const neckOccluder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
    new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true }),
  );
  neckOccluder.visible = false;
  scene.add(neckOccluder);

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

  // Clone every material slot (meshes commonly carry more than one, e.g. a
  // separate frame vs. lens material) so tinting doesn't mutate materials
  // shared elsewhere, and so a multi-material mesh keeps all of its slots
  // instead of collapsing onto just the first one.
  const materials: import('three').Material[] = [];
  const baseColors: (import('three').Color | null)[] = [];
  template.traverse((obj) => {
    const mesh = obj as import('three').Mesh;
    if (!(mesh as { isMesh?: boolean }).isMesh) return;
    const trackColorable = (material: import('three').Material) => {
      // Uploaded assets vary wildly in quality — inconsistent face winding
      // or inverted normals are common, especially on anything converted
      // from another format. Rendering both sides means a bad winding
      // makes a face look flat-shaded at worst, never invisible.
      material.side = THREE.DoubleSide;
      const colorable = material as import('three').MeshStandardMaterial;
      materials.push(material);
      baseColors.push(colorable.color ? colorable.color.clone() : null);
    };
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => {
        const cloned = m.clone();
        trackColorable(cloned);
        return cloned;
      });
    } else {
      const cloned = mesh.material.clone();
      mesh.material = cloned;
      trackColorable(cloned);
    }
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

      // The camera's distance and near/far were fixed constants tuned for
      // a model near unit scale. An instance's `size` is a canvas pixel
      // measurement — routinely in the hundreds — and once the model is
      // scaled up to it, a fixed camera.position.z of 10 sits *inside* the
      // model's own volume instead of in front of it, near/far-clipping
      // most of the geometry away. Keeping the camera distance and near/far
      // proportional to the largest instance keeps it outside the model at
      // any size.
      const maxSize = transforms.reduce((max, t) => Math.max(max, t.size), 0) || 1;
      camera.position.z = maxSize * 2;
      camera.near = maxSize * 0.01;
      camera.far = maxSize * 10;
      camera.updateProjectionMatrix();

      transforms.forEach((t, i) => {
        const group = instances[i];
        group.position.set(t.x - width / 2, -(t.y - height / 2), 0);
        group.scale.setScalar(t.size);
        group.rotation.x = t.rotationX ?? 0;
        group.rotation.y = t.rotationY ?? 0;
        // Negated: three.js rotates counter-clockwise for a positive angle
        // as our camera sees it, while rotationZ is defined to match
        // ctx.rotate()'s clockwise-positive screen-space convention (see
        // overlay.ts), so the same angle drives both renderers identically.
        group.rotation.z = -(t.rotationZ ?? 0);
      });
    },
    setHeadOccluder(transform) {
      if (!transform) {
        occluder.visible = false;
        return;
      }
      occluder.visible = true;
      // A real head's width is roughly the same as temple-to-temple glasses
      // width, so `size` doubles as head diameter here — radius = size/2.
      const radius = transform.size * 0.5;
      // Head center sits about one radius behind the glasses' own z=0
      // plane (glasses rest on the front of the head, not at its center).
      occluder.position.set(transform.x - width / 2, -(transform.y - height / 2), -radius);
      occluder.rotation.x = transform.rotationX ?? 0;
      occluder.rotation.y = transform.rotationY ?? 0;
      occluder.rotation.z = -(transform.rotationZ ?? 0);
      // Flattened front-to-back (Z) relative to width/height (X/Y) — an
      // actual head silhouette, not a sphere.
      occluder.scale.set(transform.size, transform.size, transform.size * 0.65);
    },
    setNeckOccluder(transform) {
      if (!transform) {
        neckOccluder.visible = false;
        return;
      }
      neckOccluder.visible = true;
      // A neck is narrower than the necklace resting on it, and rises
      // above the necklace's own anchor point (which sits below the chin,
      // roughly at collarbone height — see overlay.ts's 'neck' case) — so
      // the cylinder centers above that anchor rather than on it. Only
      // matters for necklace geometry that actually has something to hide
      // behind a neck — a full chain loop or a pendant that swings back —
      // a closed, front-facing collar/plate shape is already self-occluding
      // via ordinary opaque depth testing and this is a no-op for it.
      const radius = transform.size * 0.42;
      const cylinderHeight = transform.size * 1.6;
      // Cylinder axis (world Y) sits behind the necklace's own z=0 plane by
      // one radius, same reasoning as the head occluder: the front surface
      // ends up roughly where the necklace rests against the neck, not
      // behind it entirely.
      neckOccluder.position.set(
        transform.x - width / 2,
        -(transform.y - height / 2) + cylinderHeight * 0.22,
        -radius,
      );
      neckOccluder.rotation.x = transform.rotationX ?? 0;
      neckOccluder.rotation.y = transform.rotationY ?? 0;
      neckOccluder.rotation.z = -(transform.rotationZ ?? 0);
      neckOccluder.scale.set(radius * 2, cylinderHeight, radius * 2);
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
      occluder.geometry.dispose();
      (occluder.material as import('three').Material).dispose();
      neckOccluder.geometry.dispose();
      (neckOccluder.material as import('three').Material).dispose();
      envTexture.dispose();
      renderer.dispose();
    },
  };
}
