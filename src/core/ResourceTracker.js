import * as THREE from 'three';

/**
 * Theo dõi tài nguyên Three.js được tạo bởi một màn hình.
 * Khi đổi màn hình, dispose() sẽ giải phóng geometry/material/texture
 * và gỡ object khỏi scene để tránh giữ bộ nhớ GPU.
 */
export class ResourceTracker {
  constructor() {
    this.resources = new Set();
  }

  track(resource) {
    if (!resource) return resource;

    if (resource.dispose || resource instanceof THREE.Object3D) {
      this.resources.add(resource);
    }

    return resource;
  }

  trackObject(object) {
    if (!object) return object;

    object.traverse((child) => {
      this.track(child);

      if (child.geometry) this.track(child.geometry);

      if (child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        materials.forEach((material) => {
          this.track(material);

          Object.values(material).forEach((value) => {
            if (value?.isTexture) this.track(value);
          });
        });
      }
    });

    return object;
  }

  dispose() {
    [...this.resources]
      .filter((resource) => resource instanceof THREE.Object3D)
      .forEach((object) => object.removeFromParent());

    this.resources.forEach((resource) => {
      if (!(resource instanceof THREE.Object3D) && resource.dispose) {
        resource.dispose();
      }
    });

    this.resources.clear();
  }
}
