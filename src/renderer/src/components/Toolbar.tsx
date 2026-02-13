import { useState, useEffect } from 'react'

interface ModsPath {
  id: string
  name: string
  path: string
  isActive: boolean
}

interface ToolbarProps {
  onSettingsClick: () => void
}

export function Toolbar({ onSettingsClick }: ToolbarProps) {
  const [modsPaths, setModsPaths] = useState<ModsPath[]>([])
  const [activePath, setActivePath] = useState<string>('')

  // Load config on mount
  useEffect(() => {
    if (window.api) {
      window.api.getConfig().then((cfg) => {
        const paths = cfg.rimworld?.modsPaths || []
        setModsPaths(paths)

        const active = paths.find((p: ModsPath) => p.isActive)
        if (active) {
          setActivePath(active.path)
        }
      })
    }
  }, [])

  // Handle path selection change
  const handlePathChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPath = e.target.value
    setActivePath(selectedPath)

    // Update config to mark this path as active
    const updatedPaths = modsPaths.map((p) => ({
      ...p,
      isActive: p.path === selectedPath
    }))

    if (window.api) {
      await window.api.setConfig('rimworld.modsPaths', updatedPaths)
    }
  }

  // Handle browse for new path
  const handleBrowse = async () => {
    if (!window.api) return

    const selectedPath = await window.api.selectFolder()
    if (selectedPath) {
      // Add new path to config
      const newPath: ModsPath = {
        id: crypto.randomUUID(),
        name: 'Custom Path',
        path: selectedPath,
        isActive: true
      }

      const updatedPaths = [...modsPaths, newPath]
      setModsPaths(updatedPaths)
      setActivePath(selectedPath)

      await window.api.setConfig('rimworld.modsPaths', updatedPaths)
    }
  }

  return (
    <div
      className="toolbar"
      style={{
        height: '50px',
        background: '#171a21',
        borderBottom: '1px solid #2a475e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px'
      }}
    >
      {/* Left: App Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '18px', color: '#c6d4df', fontWeight: 500 }}>
          📦 RimWorld Mod Downloader
        </span>
      </div>

      {/* Center: Path Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'center' }}>
        <span style={{ color: '#8f98a0', fontSize: '13px' }}>Mods Path:</span>

        <select
          value={activePath}
          onChange={handlePathChange}
          style={{
            background: '#2a475e',
            color: '#c6d4df',
            border: '1px solid #3d6c8d',
            padding: '6px 12px',
            borderRadius: '3px',
            fontSize: '13px',
            minWidth: '200px',
            maxWidth: '300px',
            cursor: 'pointer'
          }}
        >
          {modsPaths.length === 0 ? (
            <option value="">Select or browse for path...</option>
          ) : (
            modsPaths.map((path) => (
              <option key={path.id} value={path.path}>
                {path.name} - {path.path}
              </option>
            ))
          )}
        </select>

        <button
          onClick={handleBrowse}
          style={{
            background: '#3d6c8d',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4a7ba3')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#3d6c8d')}
        >
          Browse
        </button>
      </div>

      {/* Right: Settings Button */}
      <button
        onClick={onSettingsClick}
        style={{
          background: '#2a475e',
          color: '#c6d4df',
          border: '1px solid #3d6c8d',
          padding: '8px 16px',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#3d6c8d'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#2a475e'
          e.currentTarget.style.color = '#c6d4df'
        }}
      >
        ⚙️ Settings
      </button>
    </div>
  )
}
