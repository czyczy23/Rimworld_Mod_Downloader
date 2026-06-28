import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { CurrentPageInfo } from './WebviewContainer'
import { useConfigStore } from '../stores/configStore'
import type { ModsPath } from '../utils/modsPathUtils'
import type { AppConfig, ModVersionInfo } from '../../../shared/types'
import { AppIcon } from './AppIcon'

interface ToolbarProps {
  onSettingsClick: () => void
  onDownloadClick?: (modId: string, isCollection: boolean) => Promise<void> | void
  onAddToQueue?: (modId: string, isCollection: boolean) => Promise<void> | void
  currentPageInfo?: CurrentPageInfo | null
  gameVersion?: string
  onRefreshGameVersion?: () => Promise<string>
  modsPaths?: ModsPath[]
  onConfigSaved?: (newConfig: AppConfig) => void
}

export function Toolbar({
  onSettingsClick,
  onDownloadClick,
  onAddToQueue,
  currentPageInfo,
  gameVersion: propGameVersion,
  onRefreshGameVersion,
  modsPaths: propModsPaths,
  onConfigSaved
}: ToolbarProps) {
  const { t } = useTranslation()
  const [modsPaths, setModsPaths] = useState<ModsPath[]>(propModsPaths || [])
  const [activePath, setActivePath] = useState<string>('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [isAddingToQueue, setIsAddingToQueue] = useState(false)
  const [versionInfo, setVersionInfo] = useState<ModVersionInfo | null>(null)
  const [isCheckingVersion, setIsCheckingVersion] = useState(false)
  const [versionMismatch, setVersionMismatch] = useState(false)
  const config = useConfigStore((state) => state.config)
  const loadConfig = useConfigStore((state) => state.loadConfig)
  const saveConfigValue = useConfigStore((state) => state.saveConfigValue)
  const [localGameVersion, setLocalGameVersion] = useState<string>(t('toolbar.detecting'))
  const gameVersion = propGameVersion !== undefined ? propGameVersion : localGameVersion

  useEffect(() => {
    const checkVersion = async () => {
      if (currentPageInfo?.isModDetailPage && currentPageInfo.modId && window.api) {
        setIsCheckingVersion(true)
        setVersionInfo(null)
        setVersionMismatch(false)

        try {
          const info = await window.api.checkModVersion(currentPageInfo.modId)
          console.log('[Toolbar] Version info:', info)
          console.log('[Toolbar] Game version:', gameVersion)
          setVersionInfo(info)

          if (
            gameVersion &&
            gameVersion !== t('toolbar.detecting') &&
            gameVersion !== t('toolbar.unknownVersion') &&
            info.supportedVersions.length > 0
          ) {
            const isCompatible = info.supportedVersions.includes(gameVersion)
            console.log(
              '[Toolbar] Is compatible:',
              isCompatible,
              'Supported versions:',
              info.supportedVersions
            )
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

    void checkVersion()
  }, [currentPageInfo?.modId, currentPageInfo?.isModDetailPage, gameVersion, t])

  useEffect(() => {
    if (propModsPaths && propModsPaths.length > 0) {
      setModsPaths(propModsPaths)
      const active = propModsPaths.find((path) => path.isActive)
      if (active) {
        setActivePath(active.path)
      }
      return
    }

    if (window.api && (propModsPaths === null || propModsPaths === undefined)) {
      loadConfig().then((cfg) => {
        if (!cfg) return
        const paths = cfg.rimworld?.modsPaths || []
        setModsPaths(paths)

        const active = paths.find((path: ModsPath) => path.isActive)
        if (active) {
          setActivePath(active.path)
        }
      })

      if (propGameVersion === undefined) {
        window.api
          .detectGameVersion()
          .then((version) => {
            setLocalGameVersion(version)
          })
          .catch(() => {
            setLocalGameVersion(t('toolbar.unknownVersion'))
          })
      }
    }
  }, [loadConfig, propGameVersion, propModsPaths, t])

  const saveRimworldPaths = async (updatedPaths: ModsPath[]): Promise<void> => {
    const currentConfig = config ?? (await loadConfig())
    if (!currentConfig) return

    const nextConfig = await saveConfigValue('rimworld', {
      ...currentConfig.rimworld,
      modsPaths: updatedPaths
    })

    if (nextConfig && onConfigSaved) {
      onConfigSaved(nextConfig)
    }
  }

  const refreshDetectedVersion = async () => {
    if (onRefreshGameVersion) {
      await onRefreshGameVersion()
      return
    }

    if (propGameVersion === undefined && window.api) {
      setLocalGameVersion(t('toolbar.detecting'))
      try {
        const version = await window.api.detectGameVersion()
        setLocalGameVersion(version)
      } catch {
        setLocalGameVersion(t('toolbar.unknownVersion'))
      }
    }
  }

  const handlePathChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPath = e.target.value
    setActivePath(selectedPath)

    const updatedPaths = modsPaths.map((path) => ({
      ...path,
      isActive: path.path === selectedPath
    }))
    setModsPaths(updatedPaths)

    if (window.api) {
      await saveRimworldPaths(updatedPaths)
      await refreshDetectedVersion()
    }
  }

  const handleBrowse = async () => {
    if (!window.api) return

    const selectedPath = await window.api.selectFolder()
    if (!selectedPath) return

    const newPath: ModsPath = {
      id: crypto.randomUUID(),
      name: 'Custom Path',
      path: selectedPath,
      isActive: true
    }

    const updatedPaths = modsPaths.map((path) => ({
      ...path,
      isActive: false
    }))
    updatedPaths.push(newPath)
    setModsPaths(updatedPaths)
    setActivePath(selectedPath)

    await saveRimworldPaths(updatedPaths)
    await refreshDetectedVersion()
  }

  const hasSteamCmdConfig = async (): Promise<boolean> => {
    if (!window.api) return false

    const currentConfig = await window.api.getConfig()
    const steamcmdPath = currentConfig.steamcmd?.executablePath
    const downloadPath = currentConfig.steamcmd?.downloadPath

    if (!steamcmdPath || !downloadPath) {
      alert(t('alerts.pleaseConfigSteamcmd'))
      return false
    }

    return true
  }

  const handleDownload = async () => {
    if (!currentPageInfo?.isModDetailPage || !currentPageInfo.modId || isDownloading) return
    if (!(await hasSteamCmdConfig())) return

    setIsDownloading(true)
    try {
      if (onDownloadClick) {
        await onDownloadClick(currentPageInfo.modId, currentPageInfo.isCollection || false)
      } else if (window.api) {
        await window.api.downloadMod(currentPageInfo.modId, currentPageInfo.isCollection || false)
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleAdd = async () => {
    if (!currentPageInfo?.isModDetailPage || !currentPageInfo.modId || isAddingToQueue) return
    if (!(await hasSteamCmdConfig())) return

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

  const canDownload = currentPageInfo?.isModDetailPage && !isDownloading
  const canAdd = currentPageInfo?.isModDetailPage && !isAddingToQueue
  const displayedModName = currentPageInfo?.modName || versionInfo?.modName

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: '50px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '18px',
              color: '#c6d4df',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AppIcon name="app" size={20} color="#66c0f4" />
            {t('app.title')}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1,
            justifyContent: 'center'
          }}
        >
          <span style={{ color: '#8f98a0', fontSize: '13px' }}>{t('toolbar.modsPath')}:</span>

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
              <option value="">{t('toolbar.selectOrBrowse')}</option>
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
            {t('toolbar.browse')}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#2a475e',
              borderRadius: '3px',
              border: '1px solid #3d6c8d'
            }}
          >
            <span style={{ color: '#8f98a0', fontSize: '12px' }}>{t('toolbar.game')}:</span>
            <span style={{ color: '#66c0f4', fontSize: '13px', fontWeight: 500 }}>
              {gameVersion}
            </span>
          </div>

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
                <span
                  className="spinner"
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                {t('toolbar.adding')}
              </>
            ) : (
              <>
                <AppIcon name="add" size={16} />
                {t('toolbar.add')}
              </>
            )}
          </button>

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
                <span
                  className="spinner"
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                {t('toolbar.downloading')}
              </>
            ) : (
              <>
                <AppIcon name="download" size={16} />
                {t('toolbar.download')}
              </>
            )}
          </button>

          <button
            data-testid="toolbar-settings-button"
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
            <AppIcon name="settings" size={16} />
            {t('toolbar.settings')}
          </button>
        </div>
      </div>

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
              {t('toolbar.current').toUpperCase()}:
            </span>
            <span
              style={{
                color: '#c6d4df',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AppIcon
                name={currentPageInfo.isCollection ? 'folder' : 'app'}
                size={15}
                color="#66c0f4"
              />
              {currentPageInfo.isCollection ? t('toolbar.collection') : t('toolbar.mod')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#8f98a0', fontSize: '12px' }}>{t('toolbar.id')}:</span>
            <code
              style={{
                background: '#2a475e',
                color: '#66c0f4',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
            >
              {currentPageInfo.modId}
            </code>
          </div>

          {displayedModName && (
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ color: '#8f98a0', fontSize: '12px' }}>{t('toolbar.name')}: </span>
              <span style={{ color: '#c6d4df', fontSize: '13px' }}>{displayedModName}</span>
            </div>
          )}

          {isCheckingVersion && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(102, 192, 244, 0.3)',
                  borderTopColor: '#66c0f4',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <span style={{ color: '#66c0f4', fontSize: '12px' }}>
                {t('toolbar.checkingVersion')}
              </span>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {versionInfo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ color: '#8f98a0', fontSize: '12px' }}>
                {t('toolbar.supportedVersions')}:
              </span>
              <span
                style={{
                  color: versionMismatch ? '#e6b800' : '#66c0f4',
                  fontSize: '13px',
                  fontWeight: 500
                }}
              >
                {versionInfo.supportedVersions.length > 0
                  ? versionInfo.supportedVersions.join(', ')
                  : t('toolbar.notSpecified')}
              </span>
              {versionMismatch && (
                <span
                  style={{
                    color: '#e6b800',
                    fontSize: '14px',
                    cursor: 'help'
                  }}
                  title={`${t('toolbar.versionMismatch')} ${t('toolbar.game')} ${gameVersion}, ${t('toolbar.supportedVersions')} ${versionInfo.supportedVersions.join(', ')}`}
                >
                  <AppIcon name="warning" size={16} />
                </span>
              )}
            </div>
          )}

          {versionInfo?.dependencies && versionInfo.dependencies.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ color: '#8f98a0', fontSize: '12px' }}>
                {t('toolbar.dependencies')}:
              </span>
              <span style={{ color: '#66c0f4', fontSize: '13px' }}>
                {versionInfo.dependencies.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
