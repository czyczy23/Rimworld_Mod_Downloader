import { useState, useEffect, useCallback } from 'react'
import type { ModsPath } from '../utils/modsPathUtils'
import { getDefaultModsPath } from '../utils/modsPathUtils'

interface WelcomeWizardProps {
  isOpen: boolean
  onComplete: () => void
}

// Steam 风格的配色
const colors = {
  bg: '#171a21',
  bgLight: '#1b2838',
  bgLighter: '#2a475e',
  accent: '#66c0f4',
  accentHover: '#4a7ba3',
  text: '#c6d4df',
  textMuted: '#8f98a0',
  success: '#4CAF50',
  warning: '#e6b800',
  error: '#f44336'
}

// 动画时长配置
const animations = {
  slideDuration: 500,
  fadeDuration: 300,
  staggerDelay: 100
}

export function WelcomeWizard({ isOpen, onComplete }: WelcomeWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  
  // 配置状态
  const [steamcmdExePath, setSteamcmdExePath] = useState('')
  const [steamcmdDownloadPath, setSteamcmdDownloadPath] = useState('')
  const [modsPaths, setModsPaths] = useState<ModsPath[]>([])
  const [activePathId, setActivePathId] = useState<string>('')
  
  // 动画状态
  const [showContent, setShowContent] = useState(true)
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([])

  // 生成背景粒子
  useEffect(() => {
    if (isOpen) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      }))
      setParticles(newParticles)
    }
  }, [isOpen])

  // 自动推导下载路径
  useEffect(() => {
    if (steamcmdExePath) {
      const basePath = steamcmdExePath.replace(/\\steamcmd\.exe$/i, '').replace(/\/steamcmd\.exe$/i, '')
      const derivedPath = `${basePath}\\steamapps\\workshop\\content\\294100`
      setSteamcmdDownloadPath(derivedPath)
    }
  }, [steamcmdExePath])

  const navigateToStep = useCallback((targetStep: number) => {
    if (isAnimating) return
    
    setDirection(targetStep > currentStep ? 'next' : 'prev')
    setIsAnimating(true)
    setShowContent(false)
    
    setTimeout(() => {
      setCurrentStep(targetStep)
      setShowContent(true)
      setTimeout(() => setIsAnimating(false), animations.slideDuration)
    }, animations.fadeDuration)
  }, [currentStep, isAnimating])

  const handleNext = () => {
    if (currentStep < 4) {
      navigateToStep(currentStep + 1)
    } else {
      saveConfigAndComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      navigateToStep(currentStep - 1)
    }
  }

  const saveConfigAndComplete = async () => {
    if (!window.api) return
    
    // 保存 SteamCMD 配置
    await window.api.setConfig('steamcmd', {
      executablePath: steamcmdExePath,
      downloadPath: steamcmdDownloadPath
    })
    
    // 保存 Mods 路径配置
    const defaultPath = getDefaultModsPath()
    await window.api.setConfig('rimworld', {
      currentVersion: '1.6',
      modsPaths: modsPaths.length > 0 ? modsPaths : [{
        id: crypto.randomUUID(),
        name: 'Default Mods Folder',
        path: defaultPath,
        isActive: true
      }],
      autoCheckUpdates: false
    })
    
    // 标记已完成首次设置
    await window.api.setConfig('firstRunCompleted', true)
    
    onComplete()
  }

  // 选择 SteamCMD 可执行文件
  const handleSelectSteamCmdExe = async () => {
    if (!window.api) return
    const filePath = await window.api.selectFile({
      title: '选择 steamcmd.exe',
      filters: [
        { name: 'Executable Files', extensions: ['exe'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (filePath) {
      setSteamcmdExePath(filePath)
    }
  }

  // 修改下载路径
  const handleChangeDownloadPath = async () => {
    if (!window.api) return
    const folderPath = await window.api.selectFolder()
    if (folderPath) {
      setSteamcmdDownloadPath(folderPath)
    }
  }

  // 添加 Mods 路径
  const handleAddModsPath = async (useDefault: boolean = false) => {
    if (useDefault) {
      const defaultPath = getDefaultModsPath()
      const newPath: ModsPath = {
        id: crypto.randomUUID(),
        name: 'RimWorld Default Mods',
        path: defaultPath,
        isActive: modsPaths.length === 0
      }
      setModsPaths(prev => [...prev, newPath])
      if (modsPaths.length === 0) setActivePathId(newPath.id)
    } else {
      if (!window.api) return
      const folderPath = await window.api.selectFolder()
      if (folderPath) {
        const newPath: ModsPath = {
          id: crypto.randomUUID(),
          name: 'Custom Path',
          path: folderPath,
          isActive: modsPaths.length === 0
        }
        setModsPaths(prev => [...prev, newPath])
        if (modsPaths.length === 0) setActivePathId(newPath.id)
      }
    }
  }

  // 删除 Mods 路径
  const handleRemoveModsPath = (id: string) => {
    setModsPaths(prev => {
      const filtered = prev.filter(p => p.id !== id)
      // 如果删除的是当前激活的，设置第一个为激活
      if (id === activePathId && filtered.length > 0) {
        setActivePathId(filtered[0].id)
      }
      return filtered
    })
  }

  // 设置激活路径
  const handleSetActivePath = (id: string) => {
    setActivePathId(id)
    setModsPaths(prev => prev.map(p => ({
      ...p,
      isActive: p.id === id
    })))
  }

  // 步骤验证
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!steamcmdExePath
      case 2:
        return !!steamcmdDownloadPath
      case 3:
        return modsPaths.length > 0
      default:
        return true
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bgLight} 50%, ${colors.bg} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      {/* 背景粒子动画 */}
      {particles.map(particle => (
        <div
          key={particle.id}
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: '4px',
            height: '4px',
            background: colors.accent,
            borderRadius: '50%',
            opacity: 0.3,
            animation: `float 3s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            pointerEvents: 'none'
          }}
        />
      ))}

      {/* 主容器 */}
      <div style={{
        width: '700px',
        maxWidth: '90vw',
        background: colors.bgLight,
        borderRadius: '8px',
        border: `1px solid ${colors.bgLighter}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* 进度条 */}
        <div style={{
          height: '3px',
          background: colors.bgLighter,
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${((currentStep + 1) / 5) * 100}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.success})`,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 10px ${colors.accent}`
          }} />
        </div>

        {/* 步骤指示器 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          padding: '20px 0 10px',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {[0, 1, 2, 3, 4].map((step) => (
            <div
              key={step}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                background: step === currentStep 
                  ? colors.accent 
                  : step < currentStep 
                    ? colors.success 
                    : colors.bgLighter,
                color: step <= currentStep ? colors.bg : colors.textMuted,
                transform: step === currentStep ? 'scale(1.1)' : 'scale(1)',
                boxShadow: step === currentStep ? `0 0 15px ${colors.accent}` : 'none'
              }}
            >
              {step < currentStep ? '✓' : step + 1}
            </div>
          ))}
        </div>

        {/* 内容区域 */}
        <div style={{
          padding: '40px',
          minHeight: '350px',
          position: 'relative'
        }}>
          {/* 步骤 0: 欢迎 */}
          {currentStep === 0 && (
            <div style={{
              opacity: showContent ? 1 : 0,
              transform: showContent 
                ? 'translateX(0)' 
                : direction === 'next' ? 'translateX(-30px)' : 'translateX(30px)',
              transition: `all ${animations.slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '64px',
                marginBottom: '24px',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                📦
              </div>
              <h1 style={{
                fontSize: '28px',
                color: colors.text,
                marginBottom: '16px',
                fontWeight: 'bold'
              }}>
                欢迎使用 RimWorld Mod Downloader
              </h1>
              <p style={{
                fontSize: '15px',
                color: colors.textMuted,
                lineHeight: '1.8',
                marginBottom: '32px'
              }}>
                这个向导将帮助您完成初次配置<br/>
                只需几步即可开始下载和管理模组
              </p>
              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  padding: '12px 20px',
                  background: colors.bgLighter,
                  borderRadius: '6px',
                  border: `1px solid ${colors.accent}`,
                  color: colors.accent,
                  fontSize: '13px'
                }}>
                  ⚡ 快速下载
                </div>
                <div style={{
                  padding: '12px 20px',
                  background: colors.bgLighter,
                  borderRadius: '6px',
                  border: `1px solid ${colors.accent}`,
                  color: colors.accent,
                  fontSize: '13px'
                }}>
                  📋 批量管理
                </div>
                <div style={{
                  padding: '12px 20px',
                  background: colors.bgLighter,
                  borderRadius: '6px',
                  border: `1px solid ${colors.accent}`,
                  color: colors.accent,
                  fontSize: '13px'
                }}>
                  🔍 依赖检查
                </div>
              </div>
            </div>
          )}

          {/* 步骤 1: SteamCMD 可执行文件 */}
          {currentStep === 1 && (
            <div style={{
              opacity: showContent ? 1 : 0,
              transform: showContent 
                ? 'translateX(0)' 
                : direction === 'next' ? 'translateX(30px)' : 'translateX(-30px)',
              transition: `all ${animations.slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
            }}>
              <h2 style={{
                fontSize: '22px',
                color: colors.text,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '28px' }}>🔧</span>
                配置 SteamCMD
              </h2>
              <p style={{
                fontSize: '14px',
                color: colors.textMuted,
                marginBottom: '32px',
                lineHeight: '1.6'
              }}>
                SteamCMD 是 Valve 提供的命令行工具，用于下载 Steam 创意工坊内容。<br/>
                如果您还没有安装，请先
                <a 
                  href="https://developer.valvesoftware.com/wiki/SteamCMD" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: colors.accent, textDecoration: 'none' }}
                >
                  下载并安装 SteamCMD
                </a>
              </p>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  color: colors.text,
                  fontSize: '14px',
                  marginBottom: '12px',
                  fontWeight: 500
                }}>
                  SteamCMD 可执行文件路径
                </label>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    value={steamcmdExePath}
                    readOnly
                    placeholder="点击右侧按钮选择 steamcmd.exe"
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      background: colors.bg,
                      border: `2px solid ${steamcmdExePath ? colors.success : colors.bgLighter}`,
                      borderRadius: '6px',
                      color: steamcmdExePath ? colors.text : colors.textMuted,
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.3s'
                    }}
                  />
                  <button
                    onClick={handleSelectSteamCmdExe}
                    style={{
                      padding: '14px 24px',
                      background: colors.accent,
                      color: colors.bg,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.accentHover
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors.accent
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    浏览...
                  </button>
                </div>
                {steamcmdExePath && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: 'rgba(76, 175, 80, 0.1)',
                    border: `1px solid ${colors.success}`,
                    borderRadius: '6px',
                    color: colors.success,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'slideIn 0.3s ease'
                  }}>
                    <span>✓</span> 已选择有效的 steamcmd.exe
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 步骤 2: SteamCMD 下载路径 */}
          {currentStep === 2 && (
            <div style={{
              opacity: showContent ? 1 : 0,
              transform: showContent 
                ? 'translateX(0)' 
                : direction === 'next' ? 'translateX(30px)' : 'translateX(-30px)',
              transition: `all ${animations.slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
            }}>
              <h2 style={{
                fontSize: '22px',
                color: colors.text,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '28px' }}>📥</span>
                配置下载路径
              </h2>
              <p style={{
                fontSize: '14px',
                color: colors.textMuted,
                marginBottom: '32px',
                lineHeight: '1.6'
              }}>
                已根据 SteamCMD 位置自动推导下载路径。<br/>
                <span style={{ color: colors.warning }}>
                  294100 是 RimWorld 的 Steam AppID，程序会自动在此目录下存储下载的模组。
                </span>
              </p>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  color: colors.text,
                  fontSize: '14px',
                  marginBottom: '12px',
                  fontWeight: 500
                }}>
                  SteamCMD 下载路径
                </label>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    value={steamcmdDownloadPath}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      background: colors.bg,
                      border: `2px solid ${steamcmdDownloadPath ? colors.success : colors.bgLighter}`,
                      borderRadius: '6px',
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={handleChangeDownloadPath}
                    style={{
                      padding: '14px 24px',
                      background: colors.bgLighter,
                      color: colors.text,
                      border: `1px solid ${colors.accent}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.accent
                      e.currentTarget.style.color = colors.bg
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors.bgLighter
                      e.currentTarget.style.color = colors.text
                    }}
                  >
                    修改路径
                  </button>
                </div>
                
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: 'rgba(102, 192, 244, 0.1)',
                  border: `1px solid ${colors.accent}`,
                  borderRadius: '6px'
                }}>
                  <div style={{
                    color: colors.accent,
                    fontSize: '13px',
                    fontWeight: 500,
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>💡</span> 路径说明
                  </div>
                  <div style={{
                    color: colors.textMuted,
                    fontSize: '12px',
                    lineHeight: '1.8',
                    fontFamily: 'monospace'
                  }}>
                    {steamcmdDownloadPath || '请先配置 SteamCMD 可执行文件'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 步骤 3: Mods 文件夹 */}
          {currentStep === 3 && (
            <div style={{
              opacity: showContent ? 1 : 0,
              transform: showContent 
                ? 'translateX(0)' 
                : direction === 'next' ? 'translateX(30px)' : 'translateX(-30px)',
              transition: `all ${animations.slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
            }}>
              <h2 style={{
                fontSize: '22px',
                color: colors.text,
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '28px' }}>📁</span>
                配置 Mods 文件夹
              </h2>
              <p style={{
                fontSize: '14px',
                color: colors.textMuted,
                marginBottom: '24px',
                lineHeight: '1.6'
              }}>
                选择 RimWorld 的 Mods 文件夹作为下载目标位置。<br/>
                您可以添加多个路径，并通过点击星标设置默认路径。
              </p>

              {/* Mods 路径列表 */}
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                marginBottom: '20px',
                padding: '4px'
              }}>
                {modsPaths.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: colors.textMuted,
                    border: `2px dashed ${colors.bgLighter}`,
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
                    <div style={{ fontSize: '14px' }}>尚未添加 Mods 文件夹</div>
                    <div style={{ fontSize: '12px', marginTop: '8px' }}>点击下方按钮添加</div>
                  </div>
                ) : (
                  modsPaths.map((path, index) => (
                    <div
                      key={path.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        background: path.isActive ? 'rgba(102, 192, 244, 0.15)' : colors.bg,
                        border: `1px solid ${path.isActive ? colors.accent : colors.bgLighter}`,
                        borderRadius: '8px',
                        marginBottom: '10px',
                        animation: `slideIn 0.3s ease ${index * 0.05}s both`,
                        transition: 'all 0.2s'
                      }}
                    >
                      <button
                        onClick={() => handleSetActivePath(path.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                          cursor: 'pointer',
                          color: path.isActive ? colors.accent : colors.textMuted,
                          transition: 'transform 0.2s',
                          transform: path.isActive ? 'scale(1.2)' : 'scale(1)'
                        }}
                        title={path.isActive ? '默认路径' : '设为默认'}
                      >
                        {path.isActive ? '★' : '☆'}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: path.isActive ? 500 : 'normal',
                          color: path.isActive ? colors.accent : colors.text,
                          marginBottom: '4px'
                        }}>
                          {path.name} {path.isActive && <span style={{ fontSize: '11px', opacity: 0.8 }}>(默认)</span>}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: colors.textMuted,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontFamily: 'monospace'
                        }}>
                          {path.path}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveModsPath(path.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: colors.error,
                          fontSize: '18px',
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
                    </div>
                  ))
                )}
              </div>

              {/* 添加按钮 */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => handleAddModsPath(true)}
                  style={{
                    padding: '12px 24px',
                    background: colors.bgLighter,
                    color: colors.text,
                    border: `1px solid ${colors.accent}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.accent
                    e.currentTarget.style.color = colors.bg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.bgLighter
                    e.currentTarget.style.color = colors.text
                  }}
                >
                  <span>🏠</span> 使用默认路径
                </button>
                <button
                  onClick={() => handleAddModsPath(false)}
                  style={{
                    padding: '12px 24px',
                    background: colors.accent,
                    color: colors.bg,
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.accentHover
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.accent
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <span>📂</span> 自定义路径
                </button>
              </div>
            </div>
          )}

          {/* 步骤 4: 完成 */}
          {currentStep === 4 && (
            <div style={{
              opacity: showContent ? 1 : 0,
              transform: showContent 
                ? 'translateX(0)' 
                : direction === 'next' ? 'translateX(30px)' : 'translateX(-30px)',
              transition: `all ${animations.slideDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '72px',
                marginBottom: '24px',
                animation: 'bounce 1s ease infinite'
              }}>
                🎉
              </div>
              <h2 style={{
                fontSize: '26px',
                color: colors.text,
                marginBottom: '16px',
                fontWeight: 'bold'
              }}>
                配置完成！
              </h2>
              <p style={{
                fontSize: '15px',
                color: colors.textMuted,
                lineHeight: '1.8',
                marginBottom: '32px'
              }}>
                您已完成所有必要配置<br/>
                现在可以开始浏览 Steam 创意工坊并下载模组了
              </p>

              {/* 配置摘要 */}
              <div style={{
                background: colors.bg,
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
                textAlign: 'left',
                border: `1px solid ${colors.bgLighter}`
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>SteamCMD</div>
                  <div style={{ fontSize: '13px', color: colors.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {steamcmdExePath}
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>下载路径</div>
                  <div style={{ fontSize: '13px', color: colors.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {steamcmdDownloadPath}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>Mods 路径 ({modsPaths.length}个)</div>
                  {modsPaths.map(p => (
                    <div key={p.id} style={{ fontSize: '13px', color: colors.text, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {p.isActive && '★ '}{p.path}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 40px',
          borderTop: `1px solid ${colors.bgLighter}`,
          background: 'rgba(0,0,0,0.2)'
        }}>
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            style={{
              padding: '12px 28px',
              background: 'transparent',
              color: currentStep === 0 ? colors.textMuted : colors.text,
              border: `1px solid ${currentStep === 0 ? colors.bgLighter : colors.bgLighter}`,
              borderRadius: '6px',
              fontSize: '14px',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: currentStep === 0 ? 0.5 : 1
            }}
          >
            ← 上一步
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            {currentStep === 4 && (
              <button
                onClick={saveConfigAndComplete}
                style={{
                  padding: '14px 36px',
                  background: colors.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: `0 4px 15px rgba(76, 175, 80, 0.3)`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 6px 20px rgba(76, 175, 80, 0.4)`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = `0 4px 15px rgba(76, 175, 80, 0.3)`
                }}
              >
                ✓ 开始使用
              </button>
            )}
            {currentStep < 4 && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                style={{
                  padding: '14px 36px',
                  background: canProceed() ? colors.accent : colors.bgLighter,
                  color: canProceed() ? colors.bg : colors.textMuted,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: canProceed() ? `0 4px 15px rgba(102, 192, 244, 0.3)` : 'none'
                }}
                onMouseEnter={(e) => {
                  if (canProceed()) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = `0 6px 20px rgba(102, 192, 244, 0.4)`
                  }
                }}
                onMouseLeave={(e) => {
                  if (canProceed()) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = `0 4px 15px rgba(102, 192, 244, 0.3)`
                  }
                }}
              >
                下一步 →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateY(-10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  )
}
