import { useState, useEffect } from 'react'
import type { CurrentPageInfo } from './WebviewContainer'
import type { ModsPath } from '../utils/modsPathUtils'

interface ModVersionInfo {
  supportedVersions: string[]
  modName: string
  dependencies: any[]
}


interface ToolbarProps {
  onSettingsClick: () => void
  onDownloadClick?: (modId: string, isCollection: boolean) => void
  onAddToQueue?: (modId: string, isCollection: boolean) => void
  currentPageInfo?: CurrentPageInfo | null
  gameVersion?: string
  onRefreshGameVersion?: () => Promise<string>
  modsPaths?: ModsPath[]
  onConfigSaved?: (newConfig: any) => void
}

export function Toolbar({ onSettingsClick, onDownloadClick, onAddToQueue, currentPageInfo, gameVersion: propGameVersion, onRefreshGameVersion, modsPaths: propModsPaths, onConfigSaved }: ToolbarProps) {
  const [modsPaths, setModsPaths] = useState<ModsPath[]>(propModsPaths || [])
  const [activePath, setActivePath] = useState<string>('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [isAddingToQueue, setIsAddingToQueue] = useState(false)
  const [versionInfo, setVersionInfo] = useState<ModVersionInfo | null>(null)
  const [isCheckingVersion, setIsCheckingVersion] = useState(false)
  const [versionMismatch, setVersionMismatch] = useState(false)

  // 使用传入的 gameVersion，如果没有则使用本地状态
  const [localGameVersion, setLocalGameVersion] = useState<string>('检测中...')
  const gameVersion = propGameVersion !== undefined ? propGameVersion : localGameVersion

  // Check mod version when page info changes
  useEffect(() => {
    const checkVersion = async () => {
      if (currentPageInfo?.isModDetailPage && currentPageInfo.modId && window.api) {
        setIsCheckingVersion(true)
        setVersionInfo(null)
        setVersionMismatch(false)

        try {
          const info = await (window.api as any).checkModVersion(currentPageInfo.modId)
          console.log('[Toolbar] Version info:', info)
          console.log('[Toolbar] Game version:', gameVersion)
          setVersionInfo(info)

          // Check compatibility - 使用与 App.tsx 相同的逻辑
          if (gameVersion && gameVersion !== '检测中...' && gameVersion !== '未知版本' && info.supportedVersions.length > 0) {
            const isCompatible = info.supportedVersions.includes(gameVersion)
            console.log('[Toolbar] Is compatible:', isCompatible, 'Supported versions:', info.supportedVersions)
            setVersionMismatch(!isCompatible)
          }
        } catch (error) {
          console.error('Failed to check mod version:', error)
        } finally {
          setIsCheckingVersion(false)
        }
      } else {
        setVersionInfo(null)
        setVersionMismatch(false)
      }
    }

    checkVersion()
  }, [currentPageInfo?.modId, currentPageInfo?.isModDetailPage, gameVersion])

  // Load config on mount
  useEffect(() => {
    // If propModsPaths is provided and has data, use it directly
    if (propModsPaths && propModsPaths.length > 0) {
      setModsPaths(propModsPaths)
      const active = propModsPaths.find((p) => p.isActive)
      if (active) {
        setActivePath(active.path)
      }
      return
    }

    // Only load from config if propModsPaths is explicitly null/undefined (initial load)
    // Don't reload if propModsPaths is an empty array - that means user cleared paths
    if (window.api && (propModsPaths === null || propModsPaths === undefined)) {
      window.api.getConfig().then((cfg) => {
        const paths = cfg.rimworld?.modsPaths || []
        setModsPaths(paths)

        const active = paths.find((p: ModsPath) => p.isActive)
        if (active) {
          setActivePath(active.path)
        }
      })

      // 如果没有传入 gameVersion，则本地检测
      if (propGameVersion === undefined) {
        window.api.detectGameVersion().then((version) => {
          setLocalGameVersion(version)
        }).catch(() => {
          setLocalGameVersion('未知版本')
        })
      }
    }
  }, [propGameVersion, propModsPaths])

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
      // Set the entire rimworld object since we can't set nested properties directly
      const currentRimworld = await window.api.getConfig('rimworld')
      const newRimworld = {
        ...currentRimworld,
        modsPaths: updatedPaths
      }
      await window.api.setConfig('rimworld', newRimworld)

      // Notify parent to update config state
      if (onConfigSaved) {
        const fullConfig = await window.api.getConfig()
        onConfigSaved(fullConfig)
      }

      // Re-detect game version after path change
      if (onRefreshGameVersion) {
        await onRefreshGameVersion()
      } else if (propGameVersion === undefined) {
        setLocalGameVersion('检测中...')
        try {
          const version = await window.api.detectGameVersion()
          setLocalGameVersion(version)
        } catch {
          setLocalGameVersion('未知版本')
        }
      }
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

      // Set the entire rimworld object since we can't set nested properties directly
      const currentRimworld = await window.api.getConfig('rimworld')
      const newRimworld = {
        ...currentRimworld,
        modsPaths: updatedPaths
      }
      await window.api.setConfig('rimworld', newRimworld)

      // Notify parent to update config state
      if (onConfigSaved) {
        const fullConfig = await window.api.getConfig()
        onConfigSaved(fullConfig)
      }

      // Re-detect game version after adding new path
      if (onRefreshGameVersion) {
        await onRefreshGameVersion()
      } else if (propGameVersion === undefined) {
        setLocalGameVersion('检测中...')
        try {
          const version = await window.api.detectGameVersion()
          setLocalGameVersion(version)
        } catch {
          setLocalGameVersion('未知版本')
        }
      }
    }
  }

  // Handle download button click
  const handleDownload = async () => {
    if (!currentPageInfo?.isModDetailPage || !currentPageInfo.modId || isDownloading) return

    // Check SteamCMD configuration before downloading
    if (window.api) {
      const config = await window.api.getConfig()
      const steamcmdPath = config.steamcmd?.executablePath
      const downloadPath = config.steamcmd?.downloadPath
      
      if (!steamcmdPath || !downloadPath) {
        alert('请先配置 SteamCMD 路径！\n\n1. SteamCMD Executable Path: steamcmd.exe 的位置\n2. SteamCMD Download Path: steamcmd根目录\\steamapps\\workshop\\content\\294100\n\n点击右上角的 ⚙️ 设置按钮进行配置。')
        return
      }
    }

    setIsDownloading(true)
    try {
      if (onDownloadClick) {
        await onDownloadClick(currentPageInfo.modId, currentPageInfo.isCollection || false)
      } else if (window.api) {
        // Direct download via API
        await window.api.downloadMod(currentPageInfo.modId, currentPageInfo.isCollection || false)
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Handle add to queue button click
  const handleAdd = async () => {
    if (!currentPageInfo?.isModDetailPage || !currentPageInfo.modId || isAddingToQueue) return

    // Check SteamCMD configuration before adding to queue
    if (window.api) {
      const config = await window.api.getConfig()
      const steamcmdPath = config.steamcmd?.executablePath
      const downloadPath = config.steamcmd?.downloadPath
      
      if (!steamcmdPath || !downloadPath) {
        alert('请先配置 SteamCMD 路径！\n\n1. SteamCMD Executable Path: steamcmd.exe 的位置\n2. SteamCMD Download Path: steamcmd根目录\\steamapps\\workshop\\content\\294100\n\n点击右上角的 ⚙️ 设置按钮进行配置。')
        return
      }
    }

    setIsAddingToQueue(true)
    try {
      if (onAddToQueue) {
        await onAddToQueue(currentPageInfo.modId, currentPageInfo.isCollection || false)
      }
    } catch (error) {
      console.error('Add to queue failed:', error)
    } finally {
      setIsAddingToQueue(false)
    }
  }

  // Check if download button should be enabled
  const canDownload = currentPageInfo?.isModDetailPage && !isDownloading
  const canAdd = currentPageInfo?.isModDetailPage && !isAddingToQueue

  return (
    <div
      className="toolbar"
      style={{
        minHeight: '50px',
        background: '#171a21',
        borderBottom: '1px solid #2a475e',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Main Toolbar Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '50px'
        }}
      >
        {/* Left: App Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', color: '#c6d4df', fontWeight: 500 }}>
            📦 RimWorld Mod Downloader
          </span>
        </div>

        {/* Center: Path Selector */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1,
            justifyContent: 'center'
          }}
        >
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

        {/* Right: Game Version, Download & Settings Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Game Version Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: '#2a475e',
            borderRadius: '3px',
            border: '1px solid #3d6c8d'
          }}>
            <span style={{ color: '#8f98a0', fontSize: '12px' }}>Game:</span>
            <span style={{ color: '#66c0f4', fontSize: '13px', fontWeight: 500 }}>
              {gameVersion}
            </span>
          </div>

          {/* Add to Queue Button */}
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            style={{
              background: canAdd ? '#3d6c8d' : '#2a475e',
              color: canAdd ? 'white' : '#8f98a0',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '3px',
              cursor: canAdd ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              opacity: canAdd ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (canAdd) {
                e.currentTarget.style.background = '#4a7ba3'
              }
            }}
            onMouseLeave={(e) => {
              if (canAdd) {
                e.currentTarget.style.background = '#3d6c8d'
              }
            }}
          >
            {isAddingToQueue ? (
              <>
                <span className="spinner" style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Adding...
              </>
            ) : (
              <>
                ➕ Add
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!canDownload}
            style={{
              background: canDownload ? '#4CAF50' : '#2a475e',
              color: canDownload ? 'white' : '#8f98a0',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '3px',
              cursor: canDownload ? 'pointer' : 'not-allowed',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              opacity: canDownload ? 1 : 0.6
            }}
            onMouseEnter={(e) => {
              if (canDownload) {
                e.currentTarget.style.background = '#45a049'
              }
            }}
            onMouseLeave={(e) => {
              if (canDownload) {
                e.currentTarget.style.background = '#4CAF50'
              }
            }}
          >
            {isDownloading ? (
              <>
                <span className="spinner" style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Downloading...
              </>
            ) : (
              <>
                📥 Download
              </>
            )}
          </button>

          {/* Settings Button */}
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
      </div>

      {/* Mod Info Panel - Shows when on a mod detail page */}
      {currentPageInfo?.isModDetailPage && (
        <div
          style={{
            background: '#1b2838',
            borderBottom: '1px solid #2a475e',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#66c0f4', fontSize: '12px', fontWeight: 500 }}>
              CURRENT:
            </span>
            <span style={{ color: '#c6d4df', fontSize: '13px' }}>
              {currentPageInfo.isCollection ? '📁 Collection' : '📦 Mod'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#8f98a0', fontSize: '12px' }}>ID:</span>
            <code style={{
              background: '#2a475e',
              color: '#66c0f4',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '12px',
              fontFamily: 'monospace'
            }}>
              {currentPageInfo.modId}
            </code>
          </div>

          {currentPageInfo.modName && (
            <div style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              <span style={{ color: '#8f98a0', fontSize: '12px' }}>Name: </span>
              <span style={{ color: '#c6d4df', fontSize: '13px' }}>
                {currentPageInfo.modName}
              </span>
            </div>
          )}

          {/* Version Check Status */}
          {isCheckingVersion && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid rgba(102, 192, 244, 0.3)',
                borderTopColor: '#66c0f4',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span style={{ color: '#66c0f4', fontSize: '12px' }}>检查版本...</span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {versionInfo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#8f98a0', fontSize: '12px' }}>支持版本:</span>
              <span style={{
                color: versionMismatch ? '#e6b800' : '#66c0f4',
                fontSize: '13px',
                fontWeight: 500
              }}>
                {versionInfo.supportedVersions.length > 0 ?
                  versionInfo.supportedVersions.join(', ') : '未指定'}
              </span>
              {versionMismatch && (
                <span style={{
                  color: '#e6b800',
                  fontSize: '14px',
                  cursor: 'help'
                }} title={`版本不匹配！游戏版本 ${gameVersion}，Mod支持版本 ${versionInfo?.supportedVersions.join(', ')}`}>⚠️</span>
              )}
            </div>
          )}

          {versionInfo?.dependencies && versionInfo.dependencies.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#8f98a0', fontSize: '12px' }}>依赖:</span>
              <span style={{ color: '#66c0f4', fontSize: '13px' }}>
                {versionInfo.dependencies.length}个
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
