import { useState, useEffect, useRef } from 'react'

interface ModsPath {
  id: string
  name: string
  path: string
  isActive: boolean
}

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
  const [showResetWarning, setShowResetWarning] = useState(false)
  
  // Mods 路径编辑状态
  const [editingPathId, setEditingPathId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLDivElement>(null)

  // 使用传入的 gameVersion，如果没有则使用本地状态
  const detectedVersion = propGameVersion !== undefined ? propGameVersion : localDetectedVersion

  // Load config on mount and when panel opens
  useEffect(() => {
    if (window.api && isOpen) {
      window.api.getConfig().then((cfg) => {
        // Ensure default values are set
        const mergedConfig = {
          ...cfg,
          steamcmd: {
            ...cfg.steamcmd,
            executablePath: cfg.steamcmd?.executablePath || '',
            downloadPath: cfg.steamcmd?.downloadPath || ''
          },
          rimworld: {
            ...cfg.rimworld,
            modsPaths: cfg.rimworld?.modsPaths || []
          },
          download: {
            ...cfg.download,
            dependencyMode: cfg.download?.dependencyMode || 'ask'
          },
          version: {
            ...cfg.version,
            onMismatch: cfg.version?.onMismatch || 'ask'
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
      // Validate SteamCMD executable path if provided
      if (tempConfig.steamcmd?.executablePath) {
        const exeName = tempConfig.steamcmd.executablePath.split(/[/\\]/).pop()?.toLowerCase()
        if (exeName && exeName !== 'steamcmd.exe') {
          alert('警告：选择的文件不是 steamcmd.exe，请确认路径正确！')
        }
      }

      // Save all config changes
      for (const [key, value] of Object.entries(tempConfig)) {
        await window.api.setConfig(key, value)
      }
      setConfig({ ...tempConfig })
      // 通知父组件配置已更新
      if (onConfigSaved) {
        onConfigSaved(tempConfig)
      }
      onClose()
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setTempConfig({ ...config })
    onClose()
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

  // Handle selecting SteamCMD executable
  const handleSelectSteamCMDExe = async () => {
    if (window.api) {
      const filePath = await window.api.selectFile({
        title: 'Select steamcmd.exe',
        filters: [
          { name: 'Executable Files', extensions: ['exe'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })
      if (filePath) {
        setTempConfig(prev => ({
          ...prev,
          steamcmd: {
            ...prev.steamcmd,
            executablePath: filePath
          }
        }))
      }
    }
  }

  // Handle selecting SteamCMD download path
  const handleSelectSteamCMDDownloadPath = async () => {
    if (window.api) {
      const folderPath = await window.api.selectFolder()
      if (folderPath) {
        setTempConfig(prev => ({
          ...prev,
          steamcmd: {
            ...prev.steamcmd,
            downloadPath: folderPath
          }
        }))
      }
    }
  }

  // ===== Mods 路径管理功能 =====
  
  const getDefaultModsPath = () => {
    return `${window.process?.env?.USERPROFILE || window.process?.env?.HOME || ''}\\AppData\\LocalLow\\Ludeon Studios\\RimWorld by Ludeon Studios\\Mods`
  }

  // 获取当前的 mods 路径列表
  const getModsPaths = (): ModsPath[] => {
    return tempConfig?.rimworld?.modsPaths || []
  }

  // 添加默认 Mods 路径
  const handleAddDefaultModsPath = () => {
    const defaultPath = getDefaultModsPath()
    const newPath: ModsPath = {
      id: crypto.randomUUID(),
      name: 'RimWorld Default Mods',
      path: defaultPath,
      isActive: getModsPaths().length === 0
    }
    
    setTempConfig(prev => ({
      ...prev,
      rimworld: {
        ...prev.rimworld,
        modsPaths: [...getModsPaths(), newPath]
      }
    }))
  }

  // 添加自定义 Mods 路径
  const handleAddCustomModsPath = async () => {
    if (!window.api) return
    
    const folderPath = await window.api.selectFolder()
    if (folderPath) {
      const newPath: ModsPath = {
        id: crypto.randomUUID(),
        name: 'Custom Path',
        path: folderPath,
        isActive: getModsPaths().length === 0
      }
      
      setTempConfig(prev => ({
        ...prev,
        rimworld: {
          ...prev.rimworld,
          modsPaths: [...getModsPaths(), newPath]
        }
      }))
    }
  }

  // 删除 Mods 路径
  const handleRemoveModsPath = (id: string) => {
    const currentPaths = getModsPaths()
    const filtered = currentPaths.filter(p => p.id !== id)
    
    // 如果删除后还有路径，且没有激活的路径，设置第一个为激活
    if (filtered.length > 0 && !filtered.some(p => p.isActive)) {
      filtered[0].isActive = true
    }
    
    setTempConfig(prev => ({
      ...prev,
      rimworld: {
        ...prev.rimworld,
        modsPaths: filtered
      }
    }))
  }

  // 设置激活路径
  const handleSetActivePath = (id: string) => {
    const currentPaths = getModsPaths()
    const updated = currentPaths.map(p => ({
      ...p,
      isActive: p.id === id
    }))
    
    setTempConfig(prev => ({
      ...prev,
      rimworld: {
        ...prev.rimworld,
        modsPaths: updated
      }
    }))
  }

  // 开始编辑路径名称
  const handleStartEdit = (path: ModsPath) => {
    setEditingPathId(path.id)
  }

  // 在编辑模式激活时聚焦输入框
  useEffect(() => {
    if (editingPathId && editInputRef.current) {
      // 延迟聚焦，确保 DOM 已渲染
      const timer = setTimeout(() => {
        editInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [editingPathId])

  // 保存编辑的路径名称
  const handleSaveEdit = () => {
    if (!editingPathId || !editInputRef.current) return
    
    // 从 contentEditable div 获取文本内容
    const newName = editInputRef.current.textContent?.trim() || ''
    const currentPaths = getModsPaths()
    const updated = currentPaths.map(p => 
      p.id === editingPathId ? { ...p, name: newName || p.name } : p
    )
    
    setTempConfig(prev => ({
      ...prev,
      rimworld: {
        ...prev.rimworld,
        modsPaths: updated
      }
    }))
    
    setEditingPathId(null)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingPathId(null)
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
      display: 'flex',
      flexDirection: 'column',
      transition: 'right 0.3s ease',
      zIndex: 1000
    }}>
      {/* 可滚动内容区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px',
        paddingBottom: '16px'
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
          SteamCMD 设置
        </h4>

        {/* SteamCMD Executable Path */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            color: '#c6d4df',
            fontSize: '13px',
            display: 'block',
            marginBottom: '8px'
          }}>
            SteamCMD 可执行文件路径:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={tempConfig.steamcmd?.executablePath || ''}
              readOnly
              placeholder="请选择 steamcmd.exe"
              style={{
                flex: 1,
                background: '#2a475e',
                color: tempConfig.steamcmd?.executablePath ? '#c6d4df' : '#8f98a0',
                border: '1px solid #3d6c8d',
                padding: '6px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'not-allowed'
              }}
            />
            <button
              onClick={handleSelectSteamCMDExe}
              style={{
                background: '#3d6c8d',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4a7ba3')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3d6c8d')}
            >
              浏览
            </button>
          </div>
        </div>

        {/* SteamCMD Download Path */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            color: '#c6d4df',
            fontSize: '13px',
            display: 'block',
            marginBottom: '8px'
          }}>
            SteamCMD 下载路径:
          </label>
          <div style={{
            color: '#8f98a0',
            fontSize: '11px',
            marginBottom: '8px',
            lineHeight: '1.5'
          }}>
            应为: steamcmd根目录\steamapps\workshop\content\294100<br/>
            (294100是RimWorld的AppID，如目录不存在请手动创建)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={tempConfig.steamcmd?.downloadPath || ''}
              readOnly
              placeholder="请选择下载文件夹"
              style={{
                flex: 1,
                background: '#2a475e',
                color: tempConfig.steamcmd?.downloadPath ? '#c6d4df' : '#8f98a0',
                border: '1px solid #3d6c8d',
                padding: '6px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'not-allowed'
              }}
            />
            <button
              onClick={handleSelectSteamCMDDownloadPath}
              style={{
                background: '#3d6c8d',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#4a7ba3')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3d6c8d')}
            >
              浏览
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

      {/* Mods 路径管理 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ color: '#66c0f4', fontSize: '14px', marginBottom: '12px' }}>
          📁 Mods 文件夹管理
        </h4>
        
        <p style={{
          fontSize: '12px',
          color: '#8f98a0',
          marginBottom: '12px',
          lineHeight: '1.5'
        }}>
          管理 RimWorld 的 Mods 文件夹路径。可以添加多个路径，点击 ★ 设置默认路径。
        </p>

        {/* Mods 路径列表 */}
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          marginBottom: '16px',
          padding: '4px'
        }}>
          {getModsPaths().length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 16px',
              color: '#8f98a0',
              border: '2px dashed #2a475e',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📂</div>
              尚未添加 Mods 文件夹
            </div>
          ) : (
            getModsPaths().map((path: ModsPath) => (
              <div
                key={path.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: path.isActive ? 'rgba(102, 192, 244, 0.15)' : '#1b2838',
                  border: `1px solid ${path.isActive ? '#66c0f4' : '#2a475e'}`,
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}
              >
                {/* 激活/默认 按钮 */}
                <button
                  onClick={() => handleSetActivePath(path.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: path.isActive ? '#66c0f4' : '#5a6875',
                    transition: 'all 0.2s',
                    padding: '2px 4px'
                  }}
                  title={path.isActive ? '默认路径' : '设为默认'}
                >
                  {path.isActive ? '★' : '☆'}
                </button>
                
                {/* 路径信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingPathId === path.id ? (
                    // 编辑模式 - 使用非受控组件避免光标问题
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <div
                        ref={editInputRef}
                        contentEditable
                        suppressContentEditableWarning
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleSaveEdit()
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            handleCancelEdit()
                          }
                        }}
                        onBlur={handleSaveEdit}
                        style={{
                          flex: 1,
                          fontSize: '12px',
                          padding: '4px 8px',
                          background: '#2a475e',
                          color: '#c6d4df',
                          border: '1px solid #66c0f4',
                          borderRadius: '4px',
                          outline: 'none',
                          minHeight: '20px',
                          cursor: 'text'
                        }}
                      >
                        {path.name}
                      </div>
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          background: '#4CAF50',
                          border: 'none',
                          color: 'white',
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="保存"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          background: '#5a6875',
                          border: 'none',
                          color: 'white',
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="取消"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    // 显示模式
                    <>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: path.isActive ? 500 : 'normal',
                        color: path.isActive ? '#66c0f4' : '#c6d4df',
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {path.name}
                        {path.isActive && <span style={{ fontSize: '10px', opacity: 0.8 }}>(默认)</span>}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#8f98a0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'monospace'
                      }}>
                        {path.path}
                      </div>
                    </>
                  )}
                </div>
                
                {/* 操作按钮 */}
                {editingPathId !== path.id && (
                  <>
                    {/* 编辑按钮 */}
                    <button
                      onClick={() => handleStartEdit(path)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#66c0f4',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(102, 192, 244, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none'
                      }}
                      title="编辑名称"
                    >
                      ✎
                    </button>
                    
                    {/* 删除按钮 */}
                    <button
                      onClick={() => handleRemoveModsPath(path.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#f44336',
                        fontSize: '16px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(244, 67, 54, 0.1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'none'
                      }}
                      title="删除"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* 添加按钮 */}
        <div style={{
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={handleAddDefaultModsPath}
            style={{
              padding: '8px 14px',
              background: '#2a475e',
              color: '#c6d4df',
              border: '1px solid #3d6c8d',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
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
            <span>🏠</span> 使用默认路径
          </button>
          <button
            onClick={handleAddCustomModsPath}
            style={{
              padding: '8px 14px',
              background: '#3d6c8d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#4a7ba3'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3d6c8d'
            }}
          >
            <span>📂</span> 自定义路径
          </button>
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

      </div>{/* 可滚动内容区域结束 */}

      {/* Buttons - 固定在底部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px 24px',
        borderTop: '1px solid #2a475e',
        background: '#1b2838',
        flexShrink: 0
      }}>
        <button
          onClick={() => setShowResetWarning(true)}
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

        <div style={{
          display: 'flex',
          gap: '8px'
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

      {/* Reset Confirmation Dialog - Red Warning */}
      {showResetWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#243447',
            border: '2px solid #f44336',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)'
          }}>
            <h3 style={{
              color: '#f44336',
              margin: '0 0 16px 0',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ 危险操作确认
            </h3>
            <p style={{
              color: '#c6d4df',
              margin: '0 0 20px 0',
              lineHeight: 1.5
            }}>
              您确定要将所有设置恢复默认值吗？<br/>
              此操作将重置以下内容：
            </p>
            <ul style={{
              color: '#8f98a0',
              margin: '0 0 20px 0',
              paddingLeft: '20px',
              lineHeight: 1.8
            }}>
              <li>SteamCMD 路径配置</li>
              <li>RimWorld 路径与版本</li>
              <li>下载与依赖设置</li>
              <li>版本检查设置</li>
            </ul>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowResetWarning(false)}
                style={{
                  background: '#2a475e',
                  color: '#c6d4df',
                  border: '1px solid #3d6c8d',
                  padding: '10px 20px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '14px',
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
                onClick={async () => {
                  if (window.api) {
                    await window.api.resetConfig()
                    // Reload config after reset
                    const newConfig = await window.api.getConfig()
                    setConfig(newConfig)
                    setTempConfig({ ...newConfig })
                    // Notify parent component
                    if (onConfigSaved) {
                      onConfigSaved(newConfig)
                    }
                  }
                  setShowResetWarning(false)
                  onClose()
                }}
                style={{
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
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
    </div>
  )
}
