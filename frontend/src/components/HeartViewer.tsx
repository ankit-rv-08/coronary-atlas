import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { Predictions, VesselName } from '../types'

const VESSEL_NAMES: VesselName[] = ['LAD', 'LCX', 'RCA']

const VESSEL_PATHS: Record<VesselName, [number, number, number][]> = {
  LAD: [[0.05, 0.30, 0.30], [0.08, 0.10, 0.35], [0.10, -0.10, 0.33], [0.08, -0.30, 0.28]],
  LCX: [[-0.10, 0.20, 0.28], [-0.22, 0.05, 0.25], [-0.28, -0.15, 0.18]],
  RCA: [[-0.15, 0.30, 0.20], [-0.28, 0.10, 0.18], [-0.32, -0.10, 0.12], [-0.26, -0.28, 0.06]],
}

function getColor(probability: number) {
  if (probability < 0.3) return '#43d17b'
  if (probability < 0.6) return '#e5c45a'
  if (probability < 0.8) return '#f28b4b'
  return '#ef5364'
}

function HeartCore() {
  const { scene } = useGLTF('/models/realistic_human_heart/scene.gltf')
  const normalizedScene = useMemo(() => {
    const clone = scene.clone(true)
    const bounds = new THREE.Box3().setFromObject(clone)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z)
    clone.position.sub(center)
    clone.scale.setScalar(2 / maxDimension)
    return clone
  }, [scene])
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.25) * 0.08 })
  return <group ref={ref} position={[0, -0.08, 0]} rotation={[0.05, 0, -0.16]}><primitive object={normalizedScene} /></group>
}

useGLTF.preload('/models/realistic_human_heart/scene.gltf')

function VesselTubes({ predictions, selected, onSelect }: { predictions?: Predictions | null; selected: VesselName | null; onSelect: (name: VesselName) => void }) {
  const meshes = useMemo(() => VESSEL_NAMES.map((name) => {
    const curve = new THREE.CatmullRomCurve3(VESSEL_PATHS[name].map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    return { name, geometry: new THREE.TubeGeometry(curve, 64, 0.018, 8, false) }
  }), [])
  useEffect(() => () => meshes.forEach(({ geometry }) => geometry.dispose()), [meshes])
  return <group>{meshes.map(({ name, geometry }) => {
    const probability = predictions?.[name]?.probability
    const color = probability === undefined ? '#83a0ae' : getColor(probability)
    const mid = VESSEL_PATHS[name][Math.floor(VESSEL_PATHS[name].length / 2)]
    return <group key={name}>
      <mesh geometry={geometry} onClick={(event) => { event.stopPropagation(); onSelect(name) }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'auto' }}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected === name ? 1.1 : 0.35} roughness={0.3} />
      </mesh>
      <Html position={[mid[0] + 0.08, mid[1], mid[2]]} center distanceFactor={1.2} style={{ pointerEvents: 'none' }}>
        <div className="heart-vessel-label" style={{ color }}>{name}</div>
      </Html>
    </group>
  })}</group>
}

export function HeartViewer({ predictions, selectedVessel = null, onSelectVessel }: { predictions?: Predictions | null; selectedVessel?: VesselName | null; onSelectVessel: (name: VesselName) => void }) {
  return <Canvas camera={{ position: [0, 0, 3.7], fov: 45 }} dpr={[1, 2]}>
    <color attach="background" args={['#09151d']} /><ambientLight intensity={0.75} /><directionalLight position={[4, 5, 5]} intensity={2.2} color="#d9f7ff" /><pointLight position={[-3, -2, 2]} intensity={3} color="#ef5364" />
    <group scale={1.12}><HeartCore /><VesselTubes predictions={predictions} selected={selectedVessel} onSelect={onSelectVessel} /></group>
    <OrbitControls enablePan={false} minDistance={2.5} maxDistance={5} />
  </Canvas>
}