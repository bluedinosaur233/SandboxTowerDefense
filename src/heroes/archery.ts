import * as THREE from 'three';

/** Two rigid arm segments; the wrist target and elbow pole are torso-local. */
export function aimArm(shoulder:THREE.Object3D,elbow:THREE.Object3D,target:THREE.Vector3,pole:THREE.Vector3){
  const a=shoulder.position,upper=.42,lower=.43;
  const direction=target.clone().sub(a),distance=THREE.MathUtils.clamp(direction.length(),.025,upper+lower-.001);
  direction.normalize();
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
  const bend=pole.clone().sub(a);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
  const middle=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,upper*upper-along*along)));
  const wrist=a.clone().addScaledVector(direction,distance),down=new THREE.Vector3(0,-1,0);
  shoulder.quaternion.setFromUnitVectors(down,middle.clone().sub(a).normalize());
  const forearm=wrist.sub(middle).normalize().applyQuaternion(shoulder.quaternion.clone().invert());
  elbow.quaternion.setFromUnitVectors(down,forearm);
}
