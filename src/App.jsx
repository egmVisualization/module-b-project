import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import './App.css'

// ===== 1. The data =====
const pokemons = [
  { id: 1, name: "Bulbasaur", type: "Grass", hp: 45, attack: 49 },
  { id: 4, name: "Charmander", type: "Fire", hp: 39, attack: 52 },
  { id: 7, name: "Squirtle", type: "Water", hp: 44, attack: 48 },
  { id: 25, name: "Pikachu", type: "Electric", hp: 35, attack: 55 },
  { id: 6, name: "Charizard", type: "Fire", hp: 78, attack: 84 },
  { id: 9, name: "Blastoise", type: "Water", hp: 79, attack: 83 },
  { id: 3, name: "Venusaur", type: "Grass", hp: 80, attack: 82 },
  { id: 150, name: "Mewtwo", type: "Psychic", hp: 106, attack: 110 },
  { id: 39, name: "Jigglypuff", type: "Normal", hp: 115, attack: 45 },
  { id: 143, name: "Snorlax", type: "Normal", hp: 160, attack: 110 },
  { id: 94, name: "Gengar", type: "Ghost", hp: 60, attack: 65 },
  { id: 131, name: "Lapras", type: "Water", hp: 130, attack: 85 },
  { id: 133, name: "Eevee", type: "Normal", hp: 55, attack: 55 },
  { id: 149, name: "Dragonite", type: "Dragon", hp: 91, attack: 134 },
  { id: 59, name: "Arcanine", type: "Fire", hp: 90, attack: 110 },
  { id: 65, name: "Alakazam", type: "Psychic", hp: 55, attack: 50 },
  { id: 68, name: "Machamp", type: "Fighting", hp: 90, attack: 130 },
  { id: 76, name: "Golem", type: "Rock", hp: 80, attack: 120 },
  { id: 130, name: "Gyarados", type: "Water", hp: 95, attack: 125 },
  { id: 148, name: "Dragonair", type: "Dragon", hp: 61, attack: 84 },
];

const spriteUrl = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

// One color per type
const typeColors = {
  Grass: "#4E9F3D",
  Fire: "#E4572E",
  Water: "#2F6FD0",
  Electric: "#E8B10F",
  Psychic: "#D14B8F",
  Normal: "#9A9277",
  Ghost: "#6A4C9C",
  Dragon: "#3D2E9E",
  Fighting: "#9E3B2B",
  Rock: "#8C7A3F",
}

// ===== 2. Chart size =====
const width = 720
const height = 520
const margin = { top: 30, right: 30, bottom: 60, left: 70 }

// ===== 3. Scales: turn HP and attack into pixel positions =====
const x = d3.scaleLinear()
  .domain([20, 180])
  .range([margin.left, width - margin.right])

const y = d3.scaleLinear()
  .domain([30, 150])
  .range([height - margin.bottom, margin.top])

// The medians that split the chart into four quadrants
const medianHp = d3.median(pokemons, d => d.hp)
const medianAttack = d3.median(pokemons, d => d.attack)

// Every Pokémon's normal position on the chart
const basePoints = pokemons.map(p => ({ ...p, x: x(p.hp), y: y(p.attack) }))

// ===== 4. The magnifying glass =====
const LENS_RADIUS = 90    // how far the magnifier reaches, in pixels
const LENS_STRENGTH = 4   // how strongly it spreads dots apart

// Pushes a point away from the mouse if it's inside the lens.
// Points right under the mouse barely move; points near the lens edge
// move the most, so crowded dots fan out.
function magnify(point, focus) {
  if (!focus) return point
  const dx = point.x - focus.x
  const dy = point.y - focus.y
  const distance = Math.hypot(dx, dy)
  if (distance === 0 || distance >= LENS_RADIUS) return point

  const t = distance / LENS_RADIUS
  const newDistance = LENS_RADIUS * ((LENS_STRENGTH + 1) * t) / (LENS_STRENGTH * t + 1)
  const scale = newDistance / distance
  return { ...point, x: focus.x + dx * scale, y: focus.y + dy * scale }
}

// ===== 5. The chart component =====
function App() {
  const svgRef = useRef(null)
  const [focus, setFocus] = useState(null)        // where the mouse is
  const [releasedId, setReleasedId] = useState(null) // which Pokémon is "released"

  // Download all the sprite pictures in advance so they appear instantly on hover
  useEffect(() => {
    pokemons.forEach(p => {
      const img = new Image()
      img.src = spriteUrl(p.id)
    })
  }, [])

  // Where each dot appears right now, after the magnifier
  const points = basePoints.map(p => magnify(p, focus))

  function handleMouseMove(event) {
    const [mouseX, mouseY] = d3.pointer(event, svgRef.current)
    const newFocus = { x: mouseX, y: mouseY }
    setFocus(newFocus)

    const moved = basePoints.map(p => magnify(p, newFocus))
    const distanceTo = p => Math.hypot(p.x - mouseX, p.y - mouseY)

    // Keep the current Pokémon released while the mouse stays near it
    const current = moved.find(p => p.id === releasedId)
    if (current && distanceTo(current) < 40) return

    // Otherwise, release the closest dot if the mouse is on it
    const closest = d3.least(moved, distanceTo)
    setReleasedId(closest && distanceTo(closest) < 16 ? closest.id : null)
  }

  function handleMouseLeave() {
    setFocus(null)
    setReleasedId(null)
  }

  // Draw the released Pokémon last so it sits on top of everything
  const ordered = [...points].sort(
    (a, b) => (a.id === releasedId) - (b.id === releasedId)
  )

  const plotLeft = margin.left
  const plotRight = width - margin.right
  const plotTop = margin.top
  const plotBottom = height - margin.bottom

  return (
    <main className="chart-page">
      <h1>Who hits hard, and who lasts?</h1>
      <p className="subtitle">
        Twenty well-known Pokémon by HP and attack. The dashed lines mark the
        median of each. Move across the chart to spread out crowded dots, and
        land on one to release its Pokémon.
      </p>

      <svg
        ref={svgRef}
        className="scatter"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Median lines */}
        <line className="median-line"
          x1={x(medianHp)} x2={x(medianHp)} y1={plotTop} y2={plotBottom} />
        <line className="median-line"
          x1={plotLeft} x2={plotRight} y1={y(medianAttack)} y2={y(medianAttack)} />

        {/* Quadrant labels */}
        <text className="quadrant-label" x={plotLeft + 12} y={plotTop + 18}>
          Glass cannons
        </text>
        <text className="quadrant-label" x={plotRight - 12} y={plotTop + 18} textAnchor="end">
          Powerhouses
        </text>
        <text className="quadrant-label" x={plotLeft + 12} y={plotBottom - 12}>
          Lightweights
        </text>
        <text className="quadrant-label" x={plotRight - 12} y={plotBottom - 12} textAnchor="end">
          Tanks
        </text>

        {/* Axes: two lines meeting at the bottom-left corner, with no tick marks */}
        <line className="axis-line" x1={plotLeft} x2={plotRight} y1={plotBottom} y2={plotBottom} />
        <line className="axis-line" x1={plotLeft} x2={plotLeft} y1={plotTop} y2={plotBottom} />

        {x.ticks(8).map(tick => (
          <text key={`x${tick}`} className="tick-label"
            x={x(tick)} y={plotBottom + 20} textAnchor="middle">
            {tick}
          </text>
        ))}
        {y.ticks(6).map(tick => (
          <text key={`y${tick}`} className="tick-label"
            x={plotLeft - 12} y={y(tick)} dy="0.35em" textAnchor="end">
            {tick}
          </text>
        ))}

        <text className="axis-title" x={(plotLeft + plotRight) / 2} y={height - 12} textAnchor="middle">
          HP
        </text>
        <text className="axis-title" textAnchor="middle"
          transform={`translate(18, ${(plotTop + plotBottom) / 2}) rotate(-90)`}>
          Attack
        </text>

        {/* The magnifying glass outline */}
        {focus && (
          <circle className="lens" cx={focus.x} cy={focus.y} r={LENS_RADIUS} />
        )}

        {/* The Pokémon */}
        {ordered.map(p =>
          p.id === releasedId ? (
            <g key={`released-${p.id}`} className="released"
              style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
              <circle className="release-burst" r={34} fill={typeColors[p.type]} />
              <image className="sprite" href={spriteUrl(p.id)}
                x={-40} y={-62} width={80} height={80} />
              <text className="sprite-name" y={32} textAnchor="middle">{p.name}</text>
              <text className="sprite-stats" y={50} textAnchor="middle">
                {p.type}, HP {p.hp}, attack {p.attack}
              </text>
            </g>
          ) : (
            <g key={`dot-${p.id}`} className="dot-group"
              style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
              <circle className="dot" r={7} fill={typeColors[p.type]} />
            </g>
          )
        )}
      </svg>

      {/* Color key */}
      <ul className="legend">
        {Object.entries(typeColors).map(([type, color]) => (
          <li key={type}>
            <span className="swatch" style={{ background: color }} />
            {type}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
