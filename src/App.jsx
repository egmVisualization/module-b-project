import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
          <h1>It appears to have worked.</h1>
          <p>Why isn't it centered?</p>
    </>
  )
}

export default App
