/**
 * Decodes MediaPipe FaceLandmarker's per-frame facial transformation matrix
 * into pitch/yaw/roll, so the 3D custom-model overlay can tilt with real
 * head pose instead of only the in-plane roll derived from the 2D eye-line
 * angle. Only used for the WebGL model overlay — the 2D line-art path can't
 * meaningfully represent out-of-plane rotation and is untouched.
 *
 * Sign convention: MediaPipe's matrix is defined in its own canonical
 * face-model coordinate frame, which doesn't match this app's mirrored-video
 * convention directly. The matrix decomposition itself is verified correct
 * (cross-checked by hand against a real detected frontal photo — see project
 * history). Yaw needed negating relative to the raw decomposition — confirmed
 * on a real device, where the un-negated sign made the model turn opposite
 * the user's actual head movement (mirrored video: turning your head to your
 * own right should turn the model the same way the mirror shows your face
 * turning). Pitch matched real-device behavior as-is.
 */
export const HEAD_POSE_YAW_SIGN = -1;
export const HEAD_POSE_PITCH_SIGN = 1;

export interface HeadPoseEuler {
  /** Rotation about X — nodding up/down. */
  pitch: number;
  /** Rotation about Y — turning left/right. */
  yaw: number;
  /** Rotation about Z — tilting ear-to-shoulder. */
  roll: number;
}

/**
 * Decomposes a column-major 4x4 rigid-transform matrix (MediaPipe's
 * `facialTransformationMatrixes[i].data`, 16 numbers) into XYZ-order Euler
 * angles, ignoring translation. Uses the same convention three.js's
 * `Euler.setFromRotationMatrix(m, 'XYZ')` does, since MediaPipe's own
 * sample code applies this matrix directly via three.js for AR effects.
 */
export function matrixToEuler(data: ArrayLike<number>): HeadPoseEuler {
  // Columns of the rotation submatrix may carry a uniform scale (the matrix
  // also encodes face size) — normalize each column to a unit vector first
  // so the angles aren't distorted. Indices match three.js's column-major
  // `Matrix4.elements` layout: column 0 = [0,1,2], column 1 = [4,5,6],
  // column 2 = [8,9,10].
  const normalize3 = (x: number, y: number, z: number): [number, number, number] => {
    const len = Math.hypot(x, y, z) || 1;
    return [x / len, y / len, z / len];
  };
  const [m11] = normalize3(data[0], data[1], data[2]);
  const [m12, m22, m32] = normalize3(data[4], data[5], data[6]);
  const [m13, m23, m33] = normalize3(data[8], data[9], data[10]);

  const yaw = Math.asin(Math.max(-1, Math.min(1, m13)));
  let pitch: number;
  let roll: number;
  if (Math.abs(m13) < 0.9999999) {
    pitch = Math.atan2(-m23, m33);
    roll = Math.atan2(-m12, m11);
  } else {
    pitch = Math.atan2(m32, m22);
    roll = 0;
  }

  return {
    pitch: pitch * HEAD_POSE_PITCH_SIGN,
    yaw: yaw * HEAD_POSE_YAW_SIGN,
    roll,
  };
}
