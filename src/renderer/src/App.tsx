import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { WebviewContainer, type WebviewContainerRef, type CurrentPageInfo } from './components/WebviewContainer'
import { Toolbar } from './components/Toolbar'
import { DownloadQueue } from './components/DownloadQueue'
import { SettingsPanel } from './components/SettingsPanel'
import { DependencyDialog } from './components/DependencyDialog'
import { VersionMismatchDialog } from './components/VersionMismatchDialog'
import { PendingQueueDialog } from './components/PendingQueueDialog'
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog'

// Extend Window interface for our API
declare global {
  interface Window {
    api: {
      getConfig: (key?: string) => Promise<any>
      setConfig: (key: string, value: any) => Promise<void>
      downloadMod: (id: string, isCollection: boolean) => Promise<any>
      downloadBatch: (items: { id: string; name: string; isCollection: boolean }[]) => Promise<any[]>
      checkDependencies: (id: string) => Promise<any[]>
      checkModVersion: (modId: string) => Promise<{ supportedVersions: string[], modName: string, dependencies: any[] }>
      selectFolder: () => Promise<string | null>
      selectFile: (options?: {
        title?: string
        defaultPath?: string
        filters?: { name: string, extensions: string[] }[]
        properties?: ('openFile' | 'multiSelections')[]
      }) => Promise<string | null>
      onDownloadProgress: (callback: (data: {
        id: string
        status: string
        progress: number
        message?: string
        current?: number
        total?: number
      }) => void) => () => void
      onDownloadComplete: (callback: (data: any) => void) => () => void
      onDownloadError: (callback: (data: { id: string; error: string }) => void) => () => void
      onBatchProgress: (callback: (data: any) => void) => () => void
      detectGameVersion: () => Promise<string>
      resetConfig: () => Promise<boolean>
      onConfigReset: (callback: () => void) => () => void
    }
  }
}

interface DownloadItem {
  id: string
  name: string
  progress: number
  status: 'pending' | 'downloading' | 'checking' | 'moving' | 'completed' | 'error'
  error?: string
  message?: string
}

interface BatchDownloadInfo {
  isBatch: boolean
  current: number
  total: number
  currentName: string
  id: string
}

interface PendingDownloadItem {
  id: string
  name: string
  isCollection: boolean
  modName?: string
}

interface AppConfig {
  download?: {
    dependencyMode?: 'ask' | 'auto' | 'ignore'
    autoDownloadDependencies?: boolean
    skipVersionCheck?: boolean
  }
  version?: {
    onMismatch?: 'ask' | 'force' | 'skip'
  }
  rimworld?: {
    currentVersion?: string
  }
}

function App() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [batchInfo, setBatchInfo] = useState<BatchDownloadInfo | undefined>()
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showDependencyDialog, setShowDependencyDialog] = useState(false)
  const [showVersionMismatchDialog, setShowVersionMismatchDialog] = useState(false)
  const [currentPageInfo, setCurrentPageInfo] = useState<CurrentPageInfo | null>(null)
  const [pendingDependencies, setPendingDependencies] = useState<{ id: string; name: string; dependencies: any[] } | null>(null)
  const [pendingVersionCheck, setPendingVersionCheck] = useState<{ id: string; name: string; isCollection: boolean; modVersions: string[] } | null>(null)
  const [pendingAddVersionCheck, setPendingAddVersionCheck] = useState<{ id: string; name: string; isCollection: boolean; modVersions: string[] } | null>(null)
  const [gameVersion, setGameVersion] = useState<string>('')
  const webviewRef = useRef<WebviewContainerRef>(null)

  // 待下载队列相关 state
  const [pendingQueue, setPendingQueue] = useState<PendingDownloadItem[]>([])
  const [showPendingQueueDialog, setShowPendingQueueDialog] = useState(false)
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 使用 ref 避免循环依赖
  const pendingQueueRef = useRef<PendingDownloadItem[]>([])
  const currentPageInfoRef = useRef<CurrentPageInfo | null>(null)

  // 同步 pendingQueue 到 ref
  useEffect(() => {
    pendingQueueRef.current = pendingQueue
  }, [pendingQueue])

  // 同步 currentPageInfo 到 ref
  useEffect(() => {
    currentPageInfoRef.current = currentPageInfo
  }, [currentPageInfo])

  // Load config on mount
  useEffect(() => {
    if (window.api) {
      window.api.getConfig().then((cfg) => {
        console.log('Config loaded:', cfg)
        setConfig(cfg)
      })

      // Also load game version
      window.api.detectGameVersion().then((version) => {
        setGameVersion(version)
      }).catch(() => {
        setGameVersion('')
      })
    }
  }, [])

  // Listen for config reset event
  useEffect(() => {
    if (!window.api) return

    const unsubscribe = window.api.onConfigReset(() => {
      console.log('[App] Config reset received, reloading...')
      window.api.getConfig().then((cfg) => {
        setConfig(cfg)
      })
      window.api.detectGameVersion().then((version) => {
        setGameVersion(version)
      }).catch(() => {
        setGameVersion('')
      })
    })

    return unsubscribe
  }, [])

  // Set up download progress listeners
  useEffect(() => {
    if (!window.api) return

    // Listen for progress updates
    const unsubscribeProgress = window.api.onDownloadProgress((data) => {
      console.log(`[App] Download progress for ${data.id}: ${data.progress}%`)

      setDownloads(prev => {
        const existing = prev.find(d => d.id === data.id)
        if (existing) {
          // Update existing
          return prev.map(d => d.id === data.id ? {
            ...d,
            progress: data.progress,
            status: data.status as any,
            message: data.message
          } : d)
        } else {
          // Add new
          return [...prev, {
            id: data.id,
            name: `Mod ${data.id}`,
            progress: data.progress,
            status: data.status as any,
            message: data.message
          }]
        }
      })
    })

    // Listen for completion
    const unsubscribeComplete = window.api.onDownloadComplete((data) => {
      console.log(`[App] Download completed for ${data.id}`)

      setDownloads(prev => prev.map(d => d.id === data.id ? {
        ...d,
        progress: 100,
        status: 'completed',
        message: 'Download completed'
      } : d))
    })

    // Listen for errors
    const unsubscribeError = window.api.onDownloadError((data) => {
      console.error(`[App] Download error for ${data.id}:`, data.error)

      setDownloads(prev => prev.map(d => d.id === data.id ? {
        ...d,
        status: 'error',
        error: data.error,
        message: data.error
      } : d))
    })

    // Listen for batch progress
    const unsubscribeBatchProgress = window.api.onBatchProgress((data) => {
      console.log(`[App] Batch progress: ${data.current}/${data.total} - ${data.currentName}`)

      setBatchInfo({
        isBatch: data.isBatch,
        current: data.current,
        total: data.total,
        currentName: data.currentName,
        id: data.id
      })
    })

    // Cleanup
    return () => {
      unsubscribeProgress()
      unsubscribeComplete()
      unsubscribeError()
      unsubscribeBatchProgress()
    }
  }, [])

  // Handle page change from WebviewContainer
  const handlePageChanged = useCallback((info: CurrentPageInfo) => {
    console.log('[App] Page changed:', info)
    setCurrentPageInfo(info)
  }, [])

  // Check if mod version is compatible
  const isVersionCompatible = useCallback((modVersions: string[]): boolean => {
    if (!gameVersion || modVersions.length === 0) return true
    return modVersions.includes(gameVersion)
  }, [gameVersion])

  // Start single download
  const startSingleDownload = async (modId: string, isCollection: boolean, name?: string) => {
    setDownloads(prev => {
      if (prev.find(d => d.id === modId)) return prev
      return [...prev, {
        id: modId,
        name: name || (isCollection ? `Collection ${modId}` : `Mod ${modId}`),
        progress: 0,
        status: 'downloading',
        message: 'Starting download...'
      }]
    })

    try {
      if (window.api) {
        const result = await window.api.downloadMod(modId, isCollection)
        console.log('Download complete:', result)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Start batch download with dependencies
  const startBatchDownload = async (modId: string, isCollection: boolean, modName: string, dependencies: any[]) => {
    const allItems = [
      { id: modId, name: modName, isCollection },
      ...dependencies.map((dep: any) => ({ id: dep.id, name: dep.name || `Mod ${dep.id}`, isCollection: false }))
    ]

    // Add all to queue
    allItems.forEach(item => {
      setDownloads(prev => {
        if (prev.find(d => d.id === item.id)) return prev
        return [...prev, {
          id: item.id,
          name: item.name,
          progress: 0,
          status: 'pending',
          message: 'Pending...'
        }]
      })
    })

    // Start batch download
    setBatchInfo({
      isBatch: true,
      current: 1,
      total: allItems.length,
      currentName: modName,
      id: modId
    })

    try {
      if (window.api) {
        const results = await window.api.downloadBatch(allItems)
        console.log('Batch download complete:', results)
        setBatchInfo(undefined)
      }
    } catch (error) {
      console.error('Batch download failed:', error)
      setBatchInfo(undefined)
    }
  }

  // Handle download after version check passes
  const proceedWithDownload = useCallback(async (modId: string, isCollection: boolean, modName: string) => {
    if (!window.api) return

    const dependencyMode = config?.download?.dependencyMode || 'ask'
    const autoDownloadDependencies = config?.download?.autoDownloadDependencies || false

    try {
      const dependencies = await window.api.checkDependencies(modId)
      console.log(`Found ${dependencies.length} dependencies`)

      if (dependencies.length > 0) {
        if (dependencyMode === 'ignore') {
          startSingleDownload(modId, isCollection, modName)
        } else if (dependencyMode === 'auto' || autoDownloadDependencies) {
          startBatchDownload(modId, isCollection, modName, dependencies)
        } else {
          setPendingDependencies({ id: modId, name: modName, dependencies })
          setShowDependencyDialog(true)
        }
      } else {
        startSingleDownload(modId, isCollection, modName)
      }
    } catch (error) {
      console.error('Error checking dependencies:', error)
      startSingleDownload(modId, isCollection, modName)
    }
  }, [config])

  // Handle download request from Toolbar
  const handleDownloadClick = useCallback(async (modId: string, isCollection: boolean) => {
    console.log('Download clicked:', { modId, isCollection })

    if (!window.api) return

    // 如果待下载队列不为空，显示确认弹窗
    if (pendingQueueRef.current.length > 0) {
      setShowPendingQueueDialog(true)
      return
    }

    const onMismatch = config?.version?.onMismatch || 'ask'
    const skipVersionCheck = config?.download?.skipVersionCheck || false

    try {
      // Step 1: Check version compatibility first (unless skipped)
      let modVersions: string[] = []
      let modName = currentPageInfo?.modName || `Mod ${modId}`

      if (!skipVersionCheck) {
        try {
          const versionInfo = await window.api.checkModVersion(modId)
          modVersions = versionInfo.supportedVersions || []
          modName = versionInfo.modName || modName

          // Check version mismatch
          if (!isVersionCompatible(modVersions)) {
            if (onMismatch === 'skip') {
              console.log('[App] Skipping download due to version mismatch')
              return
            } else if (onMismatch === 'ask') {
              // Show version mismatch dialog
              setPendingVersionCheck({ id: modId, name: modName, isCollection, modVersions })
              setShowVersionMismatchDialog(true)
              return
            }
            // onMismatch === 'force' - continue without asking
          }
        } catch (error) {
          console.error('[App] Failed to check mod version, continuing anyway:', error)
        }
      }

      // Proceed with dependency check and download
      proceedWithDownload(modId, isCollection, modName)
    } catch (error) {
      console.error('Error in download flow:', error)
      // Fallback to direct download if anything fails
      startSingleDownload(modId, isCollection)
    }
  }, [config, currentPageInfo?.modName, gameVersion, proceedWithDownload, isVersionCompatible])

  // 在添加后继续处理依赖和队列
  const proceedWithAddToQueue = useCallback(async (modId: string, isCollection: boolean, modName: string) => {
    if (!window.api) return

    const dependencyMode = config?.download?.dependencyMode || 'ask'
    const autoDownloadDependencies = config?.download?.autoDownloadDependencies || false

    try {
      // 检查是否已经在队列中
      const alreadyInQueue = pendingQueueRef.current.some(item => item.id === modId)
      if (alreadyInQueue) {
        console.log('[App] Mod already in queue')
        return
      }

      // 检查依赖
      const dependencies = await window.api.checkDependencies(modId)
      console.log(`[App] Found ${dependencies.length} dependencies for queue`)

      // 添加主 mod 到队列
      const itemsToAdd: PendingDownloadItem[] = [
        { id: modId, name: modName, isCollection, modName }
      ]

      // 处理依赖
      if (dependencies.length > 0) {
        if (dependencyMode === 'ignore') {
          // 仅添加主 mod
        } else if (dependencyMode === 'auto' || autoDownloadDependencies) {
          // 自动添加所有依赖
          for (const dep of dependencies) {
            const depAlreadyInQueue = pendingQueueRef.current.some(item => item.id === dep.id) || itemsToAdd.some(item => item.id === dep.id)
            if (!depAlreadyInQueue) {
              itemsToAdd.push({
                id: dep.id,
                name: dep.name || `Mod ${dep.id}`,
                isCollection: false,
                modName: dep.name
              })
            }
          }
          console.log(`[App] Auto-added ${dependencies.length} dependencies to queue`)
        } else {
          // 询问用户
          setPendingDependencies({ id: modId, name: modName, dependencies })
          // 先添加主 mod，等用户确认后再添加依赖
          setPendingQueue(prev => {
            if (prev.some(item => item.id === modId)) return prev
            return [...prev, ...itemsToAdd]
          })
          setShowDependencyDialog(true)
          return
        }
      }

      // 添加到队列
      setPendingQueue(prev => [...prev, ...itemsToAdd])
      console.log(`[App] Added ${itemsToAdd.length} items to queue`)

    } catch (error) {
      console.error('[App] Error adding to queue:', error)
      // 至少添加主 mod
      setPendingQueue(prev => {
        if (prev.some(item => item.id === modId)) return prev
        return [...prev, { id: modId, name: modName, isCollection, modName }]
      })
    }
  }, [config])

  // 添加到待下载队列 - 与 Download 保持一致的版本匹配逻辑
  const handleAddToQueue = useCallback(async (modId: string, isCollection: boolean) => {
    if (!window.api) return

    console.log('[App] Adding to queue:', { modId, isCollection })

    const onMismatch = config?.version?.onMismatch || 'ask'
    const skipVersionCheck = config?.download?.skipVersionCheck || false

    try {
      // Step 1: Check version compatibility first (unless skipped)
      let modVersions: string[] = []
      let modName = currentPageInfo?.modName || `Mod ${modId}`

      if (!skipVersionCheck) {
        try {
          const versionInfo = await window.api.checkModVersion(modId)
          modVersions = versionInfo.supportedVersions || []
          modName = versionInfo.modName || modName

          // Check version mismatch
          if (!isVersionCompatible(modVersions)) {
            if (onMismatch === 'skip') {
              console.log('[App] Skipping add to queue due to version mismatch')
              return
            } else if (onMismatch === 'ask') {
              // Show version mismatch dialog for Add
              setPendingAddVersionCheck({ id: modId, name: modName, isCollection, modVersions })
              setShowVersionMismatchDialog(true)
              return
            }
            // onMismatch === 'force' - continue without asking
          }
        } catch (error) {
          console.error('[App] Failed to check mod version for add, continuing anyway:', error)
        }
      }

      // Proceed with adding to queue
      proceedWithAddToQueue(modId, isCollection, modName)
    } catch (error) {
      console.error('Error in add to queue flow:', error)
      // Fallback: at least try to add the main mod
      const modName = currentPageInfo?.modName || `Mod ${modId}`
      setPendingQueue(prev => {
        if (prev.some(item => item.id === modId)) return prev
        return [...prev, { id: modId, name: modName, isCollection, modName }]
      })
    }
  }, [config, currentPageInfo?.modName, gameVersion, proceedWithAddToQueue, isVersionCompatible])

  // 切换删除选择
  const handleToggleSelectForDelete = useCallback((modId: string) => {
    setSelectedForDelete(prev => {
      if (prev.includes(modId)) {
        return prev.filter(id => id !== modId)
      } else {
        return [...prev, modId]
      }
    })
  }, [])

  // 全选/取消全选
  const handleSelectAllForDelete = useCallback(() => {
    if (selectedForDelete.length === pendingQueue.length) {
      setSelectedForDelete([])
    } else {
      setSelectedForDelete(pendingQueue.map(item => item.id))
    }
  }, [pendingQueue, selectedForDelete])

  // 请求删除（显示确认弹窗）
  const handleRequestDelete = useCallback((modId?: string) => {
    if (modId) {
      // 单独删除
      setSelectedForDelete([modId])
    }
    setShowDeleteConfirm(true)
  }, [])

  // 确认删除
  const handleConfirmDelete = useCallback(() => {
    setPendingQueue(prev => prev.filter(item => !selectedForDelete.includes(item.id)))
    setSelectedForDelete([])
    setShowDeleteConfirm(false)
  }, [selectedForDelete])

  // 取消删除
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false)
    setSelectedForDelete([])
  }, [])

  // 设置保存后的回调
  const handleConfigSaved = useCallback((newConfig: any) => {
    setConfig(prev => prev ? { ...prev, ...newConfig } : newConfig)
  }, [])

  // 清除已完成的下载
  const handleClearCompleted = useCallback(() => {
    setDownloads(prev => prev.filter(d => d.status !== 'completed'))
  }, [])

  // 清除所有下载
  const handleClearAll = useCallback(() => {
    setDownloads([])
  }, [])

  // 刷新游戏版本（供子组件调用）
  const refreshGameVersion = useCallback(async (): Promise<string> => {
    if (!window.api) return ''
    try {
      const version = await window.api.detectGameVersion()
      setGameVersion(version)
      return version
    } catch {
      const fallbackVersion = ''
      setGameVersion(fallbackVersion)
      return fallbackVersion
    }
  }, [])

  // 开始队列下载
  const handleStartQueueDownload = useCallback(async () => {
    if (pendingQueue.length === 0) return

    console.log('[App] Starting queue download:', pendingQueue)

    // 清空队列
    const queueToDownload = [...pendingQueue]
    setPendingQueue([])
    setShowPendingQueueDialog(false)

    // 使用批量下载
    try {
      if (window.api) {
        // 添加所有到下载队列
        queueToDownload.forEach(item => {
          setDownloads(prev => {
            if (prev.find(d => d.id === item.id)) return prev
            return [...prev, {
              id: item.id,
              name: item.modName || item.name,
              progress: 0,
              status: 'pending',
              message: 'Pending...'
            }]
          })
        })

        // 设置批量信息
        setBatchInfo({
          isBatch: true,
          current: 1,
          total: queueToDownload.length,
          currentName: queueToDownload[0].modName || queueToDownload[0].name,
          id: queueToDownload[0].id
        })

        // 开始批量下载
        const results = await window.api.downloadBatch(queueToDownload.map(item => ({
          id: item.id,
          name: item.modName || item.name,
          isCollection: item.isCollection
        })))
        console.log('[App] Queue download complete:', results)
        setBatchInfo(undefined)
      }
    } catch (error) {
      console.error('[App] Queue download failed:', error)
      setBatchInfo(undefined)
    }
  }, [pendingQueue])

  // Handle version mismatch dialog confirm
  const handleVersionMismatchConfirm = useCallback(async (rememberChoice: boolean, action: 'force' | 'skip') => {
    // 确定是哪个操作触发的版本不匹配
    const isAddAction = pendingAddVersionCheck !== null
    const pendingCheck = pendingAddVersionCheck || pendingVersionCheck

    if (!pendingCheck) return

    setShowVersionMismatchDialog(false)
    const { id, name, isCollection } = pendingCheck

    if (isAddAction) {
      setPendingAddVersionCheck(null)
    } else {
      setPendingVersionCheck(null)
    }

    // 如果记住选择，保存到配置
    if (rememberChoice && window.api) {
      try {
        const currentConfig = await window.api.getConfig()
        const newOnMismatch = action === 'force' ? 'force' : 'skip'
        await window.api.setConfig('version', {
          ...currentConfig.version,
          onMismatch: newOnMismatch
        })
        // 更新本地 config state
        setConfig(prev => prev ? {
          ...prev,
          version: {
            ...prev.version,
            onMismatch: newOnMismatch
          }
        } : null)
        console.log(`[App] Saved version mismatch behavior: ${newOnMismatch}`)
      } catch (error) {
        console.error('[App] Failed to save config:', error)
      }
    }

    // 根据选择的动作执行
    if (action === 'force') {
      if (isAddAction) {
        // 添加到队列
        proceedWithAddToQueue(id, isCollection, name)
      } else {
        // 直接下载
        proceedWithDownload(id, isCollection, name)
      }
    }
    // action === 'skip' 时什么都不做
  }, [pendingVersionCheck, pendingAddVersionCheck, proceedWithDownload, proceedWithAddToQueue])

  // Handle dependency dialog confirm
  const handleDependencyConfirm = useCallback(async (selectedIds: string[]) => {
    if (!pendingDependencies) return

    setShowDependencyDialog(false)

    // 判断是直接下载还是添加到队列：如果主 mod 已在队列中，则是添加到队列场景
    const isQueueScenario = pendingQueueRef.current.some(item => item.id === pendingDependencies!.id)

    if (isQueueScenario) {
      // 添加到队列场景
      const selectedDeps = pendingDependencies.dependencies.filter((d: any) => selectedIds.includes(d.id))
      const itemsToAdd: PendingDownloadItem[] = selectedDeps.map(dep => ({
        id: dep.id,
        name: dep.name || `Mod ${dep.id}`,
        isCollection: false,
        modName: dep.name
      }))

      setPendingQueue(prev => {
        const newQueue = [...prev]
        itemsToAdd.forEach(item => {
          if (!newQueue.some(q => q.id === item.id)) {
            newQueue.push(item)
          }
        })
        return newQueue
      })
    } else {
      // 直接下载场景
      const selectedDeps = pendingDependencies.dependencies.filter((d: any) => selectedIds.includes(d.id))
      startBatchDownload(
        pendingDependencies.id,
        currentPageInfoRef.current?.isCollection || false,
        pendingDependencies.name,
        selectedDeps
      )
    }

    setPendingDependencies(null)
  }, [pendingDependencies])

  // Handle dependency dialog cancel
  const handleDependencyCancel = useCallback(() => {
    setShowDependencyDialog(false)
    setPendingDependencies(null)
  }, [])

  return (
    <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1b2838' }}>
      {/* Header / Toolbar with Download Button */}
      <Toolbar
        onSettingsClick={() => setShowSettings(!showSettings)}
        onDownloadClick={handleDownloadClick}
        onAddToQueue={handleAddToQueue}
        currentPageInfo={currentPageInfo}
        gameVersion={gameVersion}
        onRefreshGameVersion={refreshGameVersion}
        modsPaths={config ? (config as any).rimworld?.modsPaths : undefined}
        onConfigSaved={handleConfigSaved}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Webview - Steam Workshop */}
        <div style={{ flex: 1, display: 'flex', height: '100%' }}>
          <WebviewContainer
            ref={webviewRef}
            onDownloadRequest={handleDownloadClick}
            onPageChanged={handlePageChanged}
          />
        </div>

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          gameVersion={gameVersion}
          onRefreshGameVersion={refreshGameVersion}
          onConfigSaved={handleConfigSaved}
        />
      </div>

      {/* Version Mismatch Dialog */}
      {(pendingVersionCheck || pendingAddVersionCheck) && (
        <VersionMismatchDialog
          isOpen={showVersionMismatchDialog}
          modName={(pendingVersionCheck || pendingAddVersionCheck)!.name}
          modVersions={(pendingVersionCheck || pendingAddVersionCheck)!.modVersions}
          gameVersion={gameVersion}
          onConfirm={handleVersionMismatchConfirm}
          actionType={pendingAddVersionCheck ? 'add' : 'download'}
        />
      )}

      {/* Dependency Dialog */}
      {pendingDependencies && (
        <DependencyDialog
          isOpen={showDependencyDialog}
          modName={pendingDependencies.name}
          dependencies={pendingDependencies.dependencies}
          onConfirm={handleDependencyConfirm}
          onCancel={handleDependencyCancel}
        />
      )}

      {/* Bottom Status Bar - Download Queue */}
      <DownloadQueue
        downloads={downloads}
        batchInfo={batchInfo}
        pendingQueue={pendingQueue}
        selectedForDelete={selectedForDelete}
        onToggleSelectForDelete={handleToggleSelectForDelete}
        onSelectAllForDelete={handleSelectAllForDelete}
        onRequestDelete={handleRequestDelete}
        onClearCompleted={handleClearCompleted}
        onClearAll={handleClearAll}
      />

      {/* Pending Queue Confirmation Dialog */}
      <PendingQueueDialog
        isOpen={showPendingQueueDialog}
        queue={pendingQueue}
        onConfirm={handleStartQueueDownload}
        onCancel={() => setShowPendingQueueDialog(false)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        selectedCount={selectedForDelete.length}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}

export default App
