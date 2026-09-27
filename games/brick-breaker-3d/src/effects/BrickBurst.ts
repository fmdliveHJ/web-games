import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Vector3,
} from 'three';

interface Particle {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  velocity: Vector3;
  age: number;
}

export class BrickBurst {
  private readonly particles: Particle[] = [];
  private readonly lifetime = 0.45;

  public constructor(private readonly scene: Scene) {}

  public spawn(position: Vector3, color: number): void {
    for (let index = 0; index < 8; index += 1) {
      const mesh = new Mesh(
        new BoxGeometry(0.18, 0.18, 0.18),
        new MeshStandardMaterial({
          color,
          transparent: true,
          opacity: 0.95,
        }),
      );
      const angle = (Math.PI * 2 * index) / 8 + Math.random() * 0.25;
      const speed = 2.2 + Math.random() * 1.8;
      mesh.position.copy(position);
      mesh.castShadow = true;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new Vector3(
          Math.cos(angle) * speed,
          1.2 + Math.random() * 1.6,
          Math.sin(angle) * speed,
        ),
        age: 0,
      });
    }
  }

  public update(delta: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      if (!particle) {
        continue;
      }

      particle.age += delta;
      particle.velocity.y -= 7 * delta;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.mesh.rotation.x += delta * 7;
      particle.mesh.rotation.y += delta * 9;
      particle.mesh.material.opacity = Math.max(
        0,
        1 - particle.age / this.lifetime,
      );

      if (particle.age >= this.lifetime) {
        this.removeParticle(index);
      }
    }
  }

  public clear(): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      this.removeParticle(index);
    }
  }

  public dispose(): void {
    this.clear();
  }

  private removeParticle(index: number): void {
    const particle = this.particles[index];
    if (!particle) {
      return;
    }

    this.scene.remove(particle.mesh);
    particle.mesh.geometry.dispose();
    particle.mesh.material.dispose();
    this.particles.splice(index, 1);
  }
}
