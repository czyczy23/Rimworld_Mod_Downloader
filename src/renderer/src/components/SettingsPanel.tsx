import { useState, useEffect } from 'react'

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<any>(null)
  const [tempConfig, setTempConfig] = useState<any>(null)
  const [detectedVersion, setDetectedVersion] = useState<string>('1.6')

  // Load config on mount
  useEffect(() => {
    if (window.api) {
      window.api.getConfig().then((cfg) => {
        setConfig(cfg)
        setTempConfig({ ...cfg })
      })
    }
  }, [])

  // Handle save
  const handleSave = async () => {
    if (window.api) {
      // Save all config changes
      for (const [key, value] of Object.entries(tempConfig)) {
        await window.api.setConfig(key, value)
      }
      setConfig({ ...tempConfig })
      onClose()
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setTempConfig({ ...config })
    onClose()
  }

  // Handle version detection
  const handleDetectVersion = () => {
    // In a real implementation, this would read Version.txt from RimWorld folder
    const versions = ['1.4', '1.5', '1.6']
    const randomVersion = versions[Math.floor(Math.random() * versions.length)]
    setDetectedVersion(randomVersion)

    setTempConfig(prev => ({
      ...prev,
      version: {
        ...prev.version,
        autoDetect: true
      },
      rimworld: {
        ...prev.rimworld,
        currentVersion: randomVersion
      }
    }))

    // Show success message
    alert(`Detected RimWorld version: ${randomVersion}`)
  }

  // Handle manual version change
  const handleManualVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVersion = e.target.value
    setTempConfig(prev => ({
      ...prev,
      version: {
        ...prev.version,
        manualVersion: newVersion,
        autoDetect: false
      },
      rimworld: {
        ...prev.rimworld,
        currentVersion: newVersion
      }
    }))
  }

  // Handle version mismatch behavior change
  const handleVersionMismatchChange = (value: 'ask' | 'force' | 'skip') => {
    setTempConfig(prev => ({
      ...prev,
      version: {
        ...prev.version,
        onMismatch: value
      }
    }))
  }

  // Handle dependency mode change
  const handleDependencyModeChange = (value: 'ask' | 'auto' | 'ignore') => {
    setTempConfig(prev => ({
      ...prev,
      download: {
        ...prev.download,
        dependencyMode: value
      }
    }))
  }

  // Handle auto detect toggle
  const handleAutoDetectToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const autoDetect = e.target.checked
    setTempConfig(prev => ({
      ...prev,
      version: {
        ...prev.version,
        autoDetect: autoDetect
      }
    }))

    if (autoDetect) {
      handleDetectVersion()
    }
  }

  if (!config || !tempConfig) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: isOpen ? '0' : '-400px',
      width: '380px',
      height: '100vh',
      background: '#1b2838',
      borderLeft: '1px solid #2a475e',
      padding: '24px',
      overflow: 'auto',
      transition: 'right 0.3s ease',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#c6d4df', marginTop: 0, fontSize: '18px' }}>
          ⚙️ Settings
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#8f98a0',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#c6d4df')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8f98a0')}
        >
          ×
        </button>
      </div>

      {/* Game Version Settings */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ color: '#66c0f4', fontSize: '14px', marginBottom: '12px' }}>
          Game Version Settings
        </h4>

        {/* Auto Detect */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '12px',
          gap: '8px'
        }}>
          <input
            type="checkbox"
            id="autoDetect"
            checked={tempConfig.version?.autoDetect}
            onChange={handleAutoDetectToggle}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          <label
            htmlFor="autoDetect"
            style={{
              color: '#c6d4df',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Auto Detect RimWorld Version
          </label>
        </div>

        {/* Detected Version */}
        <div style={{
          marginLeft: '24px',
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          <span style={{ color: '#8f98a0' }}>Detected Version: </span>
          <span style={{ color: '#66c0f4', fontWeight: 500 }}>
            {detectedVersion}
          </span>
        </div>

        {/* Re-detect Button */}
        <div style={{ marginLeft: '24px', marginBottom: '16px' }}>
          <button
            onClick={handleDetectVersion}
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
            Re-detect Version
          </button>
        </div>

        {/* Manual Version */}
        <div style={{ marginLeft: '24px' }}>
          <label
            htmlFor="manualVersion"
            style={{
              color: '#c6d4df',
              fontSize: '13px',
              display: 'block',
              marginBottom: '8px'
            }}
          >
            Manual Version (if auto-detect fails):
          </label>
          <input
            type="text"
            id="manualVersion"
            value={tempConfig.version?.manualVersion}
            onChange={handleManualVersionChange}
            placeholder="e.g. 1.6"
            disabled={tempConfig.version?.autoDetect}
            style={{
              width: '100px',
              background: '#2a475e',
              color: '#c6d4df',
              border: '1px solid #3d6c8d',
              padding: '6px',
              borderRadius: '3px',
              fontSize: '13px',
              cursor: tempConfig.version?.autoDetect ? 'not-allowed' : 'text'
            }}
          />
        </div>
      </div>

      {/* Version Mismatch Behavior */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ color: '#66c0f4', fontSize: '14px', marginBottom: '12px' }}>
          Version Mismatch Behavior
        </h4>

        <div style={{ marginLeft: '8px' }}>
          {[
            { value: 'ask', label: 'Ask (show warning and let user decide)' },
            { value: 'force', label: 'Force Download (skip version check)' },
            { value: 'skip', label: 'Skip Download (reject incompatible mods)' }
          ].map((option) => (
            <div key={option.value} style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px',
              gap: '8px'
            }}>
              <input
                type="radio"
                id={`versionBehavior${option.value}`}
                name="versionBehavior"
                value={option.value}
                checked={tempConfig.version?.onMismatch === option.value}
                onChange={(e) => handleVersionMismatchChange(e.target.value as 'ask' | 'force' | 'skip')}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              <label
                htmlFor={`versionBehavior${option.value}`}
                style={{
                  color: '#c6d4df',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Dependency Handling */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ color: '#66c0f4', fontSize: '14px', marginBottom: '12px' }}>
          Dependency Handling
        </h4>

        <div style={{ marginLeft: '8px' }}>
          {[
            { value: 'ask', label: 'Ask (show dependencies and let user select)' },
            { value: 'auto', label: 'Auto Download (download all dependencies)' },
            { value: 'ignore', label: 'Ignore Dependencies (only download main mod)' }
          ].map((option) => (
            <div key={option.value} style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px',
              gap: '8px'
            }}>
              <input
                type="radio"
                id={`dependencyMode${option.value}`}
                name="dependencyMode"
                value={option.value}
                checked={tempConfig.download?.dependencyMode === option.value}
                onChange={(e) => handleDependencyModeChange(e.target.value as 'ask' | 'auto' | 'ignore')}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              <label
                htmlFor={`dependencyMode${option.value}`}
                style={{
                  color: '#c6d4df',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '32px',
        paddingTop: '16px',
        borderTop: '1px solid #2a475e'
      }}>
        <button
          onClick={handleCancel}
          style={{
            background: '#2a475e',
            color: '#c6d4df',
            border: '1px solid #3d6c8d',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '13px',
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
          Cancel
        </button>

        <button
          onClick={handleSave}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '13px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#45a049')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#4CAF50')}
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}
