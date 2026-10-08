import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { Predictions, VesselName } from '../types'

const VESSEL_NAMES: VesselName[] = ['LAD', 'LCX', 'RCA']

const VESSEL_PATHS: Record<VesselName, [number, number, number][]> = {
  LAD: [[0.15, 0.40, 0.45], [0.20, 0.15, 0.50], [0.25, -0.10, 0.48], [0.20, -0.35, 0.42]],
  LCX: [[-0.20, 0.30, 0.42], [-0.35, 0.10, 0.38], [-0.42, -0.15, 0.30]],
  RCA: [[-0.25, 0.40, 0.32], [-0.42, 0.15, 0.28], [-0.48, -0.10, 0.22], [-0.40, -0.35, 0.14]],
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
    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh
      mesh.material = new THREE.MeshStandardMaterial({
        color: '#7f1d1d',
        emissive: '#450a0a',
        emissiveIntensity: 0.4,
        roughness: 0.6,
        metalness: 0.1,
      })
    })
    return clone
  }, [scene])
  const ref = useRef<THREE.Group>(null)
  useEffect(() => () => {
    normalizedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material instanceof THREE.Material) mesh.material.dispose()
      }
    })
  }, [normalizedScene])
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.25) * 0.08 })
  return <group ref={ref} position={[0, -0.08, 0]} rotation={[0.05, 0, -0.16]}><primitive object={normalizedScene} /></group>
}

useGLTF.preload('/models/realistic_human_heart/scene.gltf')

function VesselTubes({ predictions, selected, onSelect }: { predictions?: Predictions | null; selected: VesselName | null; onSelect: (name: VesselName) => void }) {
  const meshes = useMemo(() => VESSEL_NAMES.map((name) => {
    const curve = new THREE.CatmullRomCurve3(VESSEL_PATHS[name].map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    return { name, geometry: new THREE.TubeGeometry(curve, 64, 0.035, 12, false) }
  }), [])
  useEffect(() => () => meshes.forEach(({ geometry }) => geometry.dispose()), [meshes])
  return <group>{meshes.map(({ name, geometry }) => {
    const probability = predictions?.[name]?.probability
    const color = probability === undefined ? '#83a0ae' : getColor(probability)
    const mid = VESSEL_PATHS[name][Math.floor(VESSEL_PATHS[name].length / 2)]
    return <group key={name}>
      <mesh geometry={geometry} onClick={(event) => { event.stopPropagation(); onSelect(name) }} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'auto' }}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected === name ? 2.0 : 1.2} roughness={0.3} toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>
      <Html position={[mid[0] + 0.08, mid[1], mid[2]]} center distanceFactor={1.2} style={{ pointerEvents: 'none' }}>
        <div className="heart-vessel-label" style={{ color, boxShadow: `0 0 8px ${color}40` }}>{name}</div>
      </Html>
    </group>
  })}</group>
}

export function HeartViewer({ predictions, selectedVessel = null, onSelectVessel }: { predictions?: Predictions | null; selectedVessel?: VesselName | null; onSelectVessel: (name: VesselName) => void }) {
  return <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
    <color attach="background" args={['#020617']} /><fog attach="fog" args={['#020617', 3, 8]} />
    <ambientLight intensity={0.35} /><directionalLight position={[4, 4, 4]} intensity={1.4} color="#ffffff" /><directionalLight position={[-4, 2, -4]} intensity={0.7} color="#22d3ee" /><directionalLight position={[0, -3, 2]} intensity={0.3} color="#f87171" />
    <group scale={1.12}><HeartCore /><VesselTubes predictions={predictions} selected={selectedVessel} onSelect={onSelectVessel} /></group>
    <ContactShadows position={[0, -1.6, 0]} opacity={0.5} scale={6} blur={2.5} far={3} color="#000000" />
    <OrbitControls enablePan={false} enableZoom enableRotate minDistance={1.8} maxDistance={5} autoRotate autoRotateSpeed={0.4} />
  </Canvas>
}