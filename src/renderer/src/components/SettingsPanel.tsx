import { useState, useEffect } from 'react'

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  gameVersion?: string;
  onRefreshGameVersion?: () => Promise<string>;
  onConfigSaved?: (newConfig: any) => void;
}

export function SettingsPanel({ isOpen, onClose, gameVersion: propGameVersion, onRefreshGameVersion, onConfigSaved }: SettingsPanelProps) {
  const [config, setConfig] = useState<any>(null)
  const [tempConfig, setTempConfig] = useState<any>(null)
  const [localDetectedVersion, setLocalDetectedVersion] = useState<string>('1.6')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // 使用传入的 gameVersion，如果没有则使用本地状态
  const detectedVersion = propGameVersion !== undefined ? propGameVersion : localDetectedVersion

  // Load config on mount and when panel opens
  useEffect(() => {
    if (window.api && isOpen) {
      window.api.getConfig().then((cfg) => {
        // Ensure default values are set - use nullish coalescing to preserve user config
        const mergedConfig = {
          ...cfg,
          steamcmd: {
            ...cfg.steamcmd
            // Don't force empty string, keep undefined as-is
          },
          download: {
            ...cfg.download,
            dependencyMode: cfg.download?.dependencyMode ?? 'ask',
            maxConcurrentDownloads: cfg.download?.maxConcurrentDownloads ?? 1
          },
          version: {
            ...cfg.version,
            onMismatch: cfg.version?.onMismatch ?? 'ask'
          }
        }
        setConfig(mergedConfig)
        setTempConfig({ ...mergedConfig })

        // Initialize detectedVersion from config
        if (mergedConfig.rimworld?.currentVersion) {
          if (propGameVersion === undefined) {
            setLocalDetectedVersion(mergedConfig.rimworld.currentVersion)
          }
        }

        // Also call detectGameVersion to get the real version if not provided
        if (propGameVersion === undefined) {
          window.api.detectGameVersion().then((version) => {
            setLocalDetectedVersion(version)
          }).catch(console.error)
        }
      })
    }
  }, [propGameVersion, isOpen])

  // Handle save
  const handleSave = async () => {
    if (window.api) {
      // Validate SteamCMD path
      const steamCmdPath = tempConfig.steamcmd?.executablePath
      if (steamCmdPath) {
        const isValid = await validateSteamCmdPath(steamCmdPath)
        if (!isValid) {
          alert('请选择有效的 steamcmd.exe 文件！\n\n文件名必须是 steamcmd.exe (不区分大小写)。')
          return
        }
      }

      // 只保存这个面板负责的字段，避免覆盖 Toolbar 修改的 rimworld 配置
      await window.api.setConfig('steamcmd', tempConfig.steamcmd)
      await window.api.setConfig('download', tempConfig.download)
      await window.api.setConfig('version', tempConfig.version)

      // 获取最新完整配置用于更新本地状态
      const latestConfig = await window.api.getConfig()
      setConfig({ ...latestConfig })
      setTempConfig({ ...latestConfig })
      // 通知父组件配置已更新
      if (onConfigSaved) {
        onConfigSaved(latestConfig)
      }
      onClose()
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setTempConfig({ ...config })
    onClose()
  }

  // Format path for display (Windows: use backslash)
  const formatPathForDisplay = (path: string): string => {
    if (!path) return ''
    // On Windows, replace forward slashes with backslashes for display
    if (process.platform === 'win32' || navigator.userAgent.indexOf('Windows') !== -1) {
      return path.replace(/\//g, '\\')
    }
    return path
  }

  // Handle reset config
  const handleResetClick = () => {
    setShowResetConfirm(true)
  }

  const handleConfirmReset = async () => {
    if (window.api) {
      try {
        await window.api.resetConfig()
        // Reload config after reset
        const newConfig = await window.api.getConfig()
        setConfig({ ...newConfig })
        setTempConfig({ ...newConfig })
        // Notify parent
        if (onConfigSaved) {
          onConfigSaved(newConfig)
        }
        alert('所有设置已重置为默认值')
      } catch (error) {
        console.error('Failed to reset config:', error)
        alert('重置设置失败')
      }
    }
    setShowResetConfirm(false)
  }

  const handleCancelReset = () => {
    setShowResetConfirm(false)
  }

  // Handle version detection
  const handleDetectVersion = async () => {
    if (window.api) {
      try {
        let version: string
        if (onRefreshGameVersion) {
          version = await onRefreshGameVersion()
        } else {
          version = await window.api.detectGameVersion()
          if (propGameVersion === undefined) {
            setLocalDetectedVersion(version)
          }
        }

        setTempConfig(prev => ({
          ...prev,
          version: {
            ...prev.version,
            autoDetect: true
          },
          rimworld: {
            ...prev.rimworld,
            currentVersion: version
          }
        }))

        alert(`检测到 RimWorld 版本: ${version}`)
      } catch (error) {
        console.error('Failed to detect version:', error)
        alert('检测版本失败')
      }
    }
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

  // Handle SteamCMD executable path browse
  const handleBrowseSteamCmdPath = async () => {
    if (window.api) {
      const api = window.api as any
      const selectedPath = await api.selectFile?.({
        title: '选择 SteamCMD 可执行文件',
        defaultPath: tempConfig.steamcmd?.executablePath,
        filters: [
          { name: '可执行文件', extensions: ['exe'] }
        ],
        properties: ['openFile']
      })
      if (selectedPath) {
        setTempConfig(prev => ({
          ...prev,
          steamcmd: {
            ...prev.steamcmd,
            executablePath: selectedPath
          }
        }))
      }
    }
  }

  // Validate SteamCMD path
  const validateSteamCmdPath = async (path: string): Promise<boolean> => {
    if (!path) return false
    // Basic client-side validation: check if filename is steamcmd.exe (case-insensitive)
    const filename = path.split(/[/\\]/).pop() || ''
    return filename.toLowerCase() === 'steamcmd.exe'
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
    <>
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
            ⚙️ 设置
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

        {/* SteamCMD Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#66c0f4', fontSize: '14px', marginBottom: '12px' }}>
            🔧 SteamCMD 设置
          </h4>

          {/* SteamCMD Executable Path */}
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                color: '#c6d4df',
                fontSize: '13px',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              SteamCMD 可执行文件路径:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={formatPathForDisplay(tempConfig.steamcmd?.executablePath || '')}
                readOnly
                style={{
                  flex: 1,
                  background: '#2a475e',
                  color: '#c6d4df',
                  border: '1px solid #3d6c8d',
                  padding: '6px 10px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={formatPathForDisplay(tempConfig.steamcmd?.executablePath || '')}
              />
              <button
                onClick={handleBrowseSteamCmdPath}
                style={{
                  background: '#3d6c8d',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#4a7ba3')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#3d6c8d')}
              >
                Browse
              </button>
            </div>
          </div>
        </div>

        {/* Game Version Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ color: '#66c0f4', fontSize: '14px', marginBottom: '12px' }}>
            游戏版本设置
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
              自动检测 RimWorld 版本
            </label>
          </div>

          {/* Detected Version */}
          <div style={{
            marginLeft: '24px',
            marginBottom: '12px',
            fontSize: '13px'
          }}>
            <span style={{ color: '#8f98a0' }}>检测到的版本: </span>
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
              重新检测版本
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
              手动设置版本（当自动检测失败时）:
            </label>
            <input
              type="text"
              id="manualVersion"
              value={tempConfig.version?.manualVersion}
              onChange={handleManualVersionChange}
              placeholder="例如: 1.6"
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
            版本不匹配处理
          </h4>

          <div style={{ marginLeft: '8px' }}>
            {[
              { value: 'ask', label: '询问 (显示警告让用户决定)' },
              { value: 'force', label: '强制下载 (跳过版本检查)' },
              { value: 'skip', label: '跳过下载 (拒绝不兼容的Mod)' }
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
            依赖处理
          </h4>

          <div style={{ marginLeft: '8px' }}>
            {[
              { value: 'ask', label: '询问 (显示依赖项让用户选择)' },
              { value: 'auto', label: '自动下载 (下载所有依赖)' },
              { value: 'ignore', label: '忽略依赖 (仅下载主Mod)' }
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
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '32px',
          paddingTop: '16px',
          borderTop: '1px solid #2a475e'
        }}>
          {/* Reset Button - Left side */}
          <button
            onClick={handleResetClick}
            style={{
              background: 'transparent',
              color: '#f44336',
              border: '1px solid #f44336',
              padding: '8px 16px',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f44336'
              e.currentTarget.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#f44336'
            }}
          >
            重置所有设置
          </button>

          {/* Save and Cancel Buttons - Right side */}
          <div style={{ display: 'flex', gap: '8px' }}>
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
              取消
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
              保存设置
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal - Outside the settings panel div */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            background: '#1b2838',
            border: '2px solid #f44336',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              <h3 style={{
                color: '#f44336',
                margin: 0,
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                警告：重置所有设置
              </h3>
            </div>

            <p style={{
              color: '#c6d4df',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '20px'
            }}>
              此操作将<strong style={{ color: '#f44336' }}>永久删除</strong>所有自定义设置，包括：
            </p>

            <ul style={{
              color: '#8f98a0',
              fontSize: '13px',
              lineHeight: '1.8',
              marginBottom: '24px',
              paddingLeft: '20px'
            }}>
              <li>Mod 下载路径设置</li>
              <li>SteamCMD 可执行文件路径</li>
              <li>版本检测和下载偏好设置</li>
              <li>其他所有自定义配置</li>
            </ul>

            <p style={{
              color: '#e6b800',
              fontSize: '13px',
              fontWeight: 'bold',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              此操作不可撤销！是否继续？
            </p>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelReset}
                style={{
                  background: '#2a475e',
                  color: '#c6d4df',
                  border: '1px solid #3d6c8d',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  minWidth: '100px'
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
                取消
              </button>

              <button
                onClick={handleConfirmReset}
                style={{
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'background 0.2s',
                  minWidth: '100px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#d32f2f')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f44336')}
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
