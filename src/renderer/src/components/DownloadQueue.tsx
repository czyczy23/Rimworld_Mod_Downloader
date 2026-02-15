import { useState, useEffect } from 'react'

export interface DownloadItem {
  id: string
  name: string
  progress: number
  status: 'pending' | 'downloading' | 'checking' | 'moving' | 'completed' | 'error' | 'cancelled'
  error?: string
  message?: string
}

interface PendingDownloadItem {
  id: string
  name: string
  isCollection: boolean
  modName?: string
}

interface DownloadQueueProps {
  downloads?: DownloadItem[]
  batchInfo?: any
  pendingQueue?: PendingDownloadItem[]
  selectedForDelete?: string[]
  onToggleSelectForDelete?: (id: string) => void
  onSelectAllForDelete?: () => void
  onRequestDelete?: (id?: string) => void
  onClearCompleted?: () => void
  onClearAll?: () => void
  onCancelDownload?: (id: string) => void
}

export function DownloadQueue({
  downloads: externalDownloads,
  batchInfo,
  pendingQueue,
  selectedForDelete,
  onToggleSelectForDelete,
  onSelectAllForDelete,
  onRequestDelete,
  onClearCompleted,
  onClearAll,
  onCancelDownload
}: DownloadQueueProps = {}) {
  const [internalDownloads, setInternalDownloads] = useState<DownloadItem[]>([])

  // Use external downloads if provided, otherwise use internal state
  const downloads = externalDownloads || internalDownloads
  const setDownloads = externalDownloads ? undefined : setInternalDownloads
  const [isExpanded, setIsExpanded] = useState(false)

  // Listen for download updates from main process
  useEffect(() => {
    // This would normally be set up via IPC
    // For now, we'll use a placeholder
    const handleDownloadUpdate = (event: CustomEvent) => {
      const { id, name, progress, status, error } = event.detail
      if (setDownloads) {
        setDownloads((prev) => {
          const existing = prev.find((d) => d.id === id)
          if (existing) {
            return prev.map((d) =>
              d.id === id ? { ...d, progress, status, error } : d
            )
          }
          return [...prev, { id, name, progress, status, error }]
        })
      }
    }

    window.addEventListener(
      'download-update' as any,
      handleDownloadUpdate as any
    )

    return () => {
      window.removeEventListener(
        'download-update' as any,
        handleDownloadUpdate as any
      )
    }
  }, [setDownloads])

  // Calculate summary stats
  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'checking' || d.status === 'moving'
  )
  const completedDownloads = downloads.filter((d) => d.status === 'completed')
  const errorDownloads = downloads.filter((d) => d.status === 'error')
  const stuckDownloads = downloads.filter((d) => d.progress < 0)

  // Get status display info
  const getStatusInfo = () => {
    if (stuckDownloads.length > 0) {
      return {
        text: `${stuckDownloads.length} download${stuckDownloads.length > 1 ? 's' : ''} may be stuck...`,
        progress: 0,
        color: '#e6b800'
      }
    }
    if (activeDownloads.length > 0) {
      // Filter out negative (stuck) progress values for average
      const validProgressDownloads = activeDownloads.filter(d => d.progress >= 0)
      const avgProgress = validProgressDownloads.length > 0
        ? Math.round(
            validProgressDownloads.reduce((sum, d) => sum + d.progress, 0) / validProgressDownloads.length
          )
        : 0
      return {
        text: `Downloading ${activeDownloads.length} mod${activeDownloads.length > 1 ? 's' : ''}...`,
        progress: avgProgress,
        color: '#66c0f4'
      }
    }
    if (errorDownloads.length > 0) {
      return {
        text: `${errorDownloads.length} download${errorDownloads.length > 1 ? 's' : ''} failed`,
        progress: 0,
        color: '#f44336'
      }
    }
    if (completedDownloads.length > 0 && downloads.length > 0) {
      return {
        text: `${completedDownloads.length} completed`,
        progress: 100,
        color: '#4CAF50'
      }
    }
    return {
      text: 'Ready',
      progress: 0,
      color: '#8f98a0'
    }
  }

  const statusInfo = getStatusInfo()

  // Clear completed downloads
  const clearCompleted = () => {
    if (onClearCompleted) {
      onClearCompleted()
    } else if (setDownloads) {
      setDownloads((prev) => prev.filter((d) => d.status !== 'completed'))
    }
  }

  // Clear all downloads
  const clearAll = () => {
    if (onClearAll) {
      onClearAll()
    } else if (setDownloads) {
      setDownloads([])
    }
  }

  return (
    <div
      className="download-queue"
      style={{
        background: '#171a21',
        borderTop: '1px solid #2a475e',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header - Click to expand/collapse */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: '#1b2838',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 500, color: '#c6d4df' }}>
            📥 Queue
          </span>

          {downloads.length > 0 && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 500,
                background: activeDownloads.length > 0 ? '#66c0f4' : '#4CAF50',
                color: activeDownloads.length > 0 ? '#171a21' : 'white'
              }}
            >
              {activeDownloads.length > 0
                ? `${activeDownloads.length} downloading`
                : `${completedDownloads.length} completed`}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status text */}
          <span style={{ color: statusInfo.color, fontSize: '13px' }}>
            {statusInfo.text}
          </span>

          {/* Progress bar for active downloads */}
          {activeDownloads.length > 0 && (
            <div
              style={{
                width: '100px',
                height: '4px',
                background: '#2a475e',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${statusInfo.progress}%`,
                  height: '100%',
                  background: statusInfo.color,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          )}

          {/* Expand/Collapse icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              fill: '#8f98a0'
            }}
          >
            <path d="M6 8L1 3h10z" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div
          style={{
            padding: '16px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}
        >
          {/* 待下载队列 */}
          {pendingQueue && pendingQueue.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#66c0f4', fontSize: '13px', fontWeight: 500 }}>
                    📋 待下载 ({pendingQueue.length})
                  </span>
                  {/* 全选/取消全选按钮 */}
                  {onSelectAllForDelete && (
                    <button
                      onClick={onSelectAllForDelete}
                      style={{
                        background: 'transparent',
                        border: '1px solid #3d6c8d',
                        color: '#8f98a0',
                        padding: '4px 10px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {selectedForDelete?.length === pendingQueue.length ? '取消全选' : '全选'}
                    </button>
                  )}
                  {/* 批量删除按钮 */}
                  {selectedForDelete && selectedForDelete.length > 0 && onRequestDelete && (
                    <button
                      onClick={() => onRequestDelete()}
                      style={{
                        background: '#f44336',
                        border: 'none',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      删除选中 ({selectedForDelete.length})
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingQueue.map(item => {
                  const isSelected = selectedForDelete?.includes(item.id)
                  return (
                    <div key={item.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: isSelected ? '#3a2c47' : '#2a475e',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${isSelected ? '#f44336' : '#e6b800'}`
                    }}>
                      {/* 复选框 */}
                      {onToggleSelectForDelete && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectForDelete(item.id)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                        />
                      )}

                      {/* Icon */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#1b2838',
                        borderRadius: '50%',
                        fontSize: '16px'
                      }}>
                        📋
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 500,
                          color: '#c6d4df',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {item.modName || item.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8f98a0' }}>
                          {item.isCollection ? 'Collection' : 'Mod'} • ID: {item.id}
                        </div>
                      </div>

                      {/* 单独删除按钮 */}
                      {onRequestDelete && (
                        <button
                          onClick={() => onRequestDelete(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#8f98a0',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            lineHeight: 1
                          }}
                          title="从队列移除"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {batchInfo && batchInfo.isBatch && (
            <div
              style={{
                background: '#171a21',
                border: '1px solid #3d6c8d',
                borderRadius: '4px',
                padding: '12px',
                marginBottom: '8px'
              }}
            >
              <div style={{
                color: '#66c0f4',
                fontSize: '13px',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                批量下载 ({batchInfo.current}/{batchInfo.total})
              </div>
              <div style={{
                color: '#c6d4df',
                fontSize: '12px'
              }}>
                当前正在下载: {batchInfo.currentName}
              </div>
            </div>
          )}

          {downloads.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#8f98a0'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📦</div>
              <p>No downloads yet</p>
              <p style={{ fontSize: '13px', color: '#5a6875' }}>
                Browse Steam Workshop and click "Download to Local" on any mod
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}
              >
                <span style={{ color: '#8f98a0', fontSize: '13px' }}>
                  {downloads.length} item{downloads.length > 1 ? 's' : ''} in queue
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {completedDownloads.length > 0 && (
                    <button
                      onClick={clearCompleted}
                      style={{
                        background: 'transparent',
                        border: '1px solid #3d6c8d',
                        color: '#8f98a0',
                        padding: '4px 10px',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Clear completed
                    </button>
                  )}

                  <button
                    onClick={clearAll}
                    style={{
                      background: 'transparent',
                      border: '1px solid #3d6c8d',
                      color: '#8f98a0',
                      padding: '4px 10px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {downloads.map((download) => (
                  <div
                    key={download.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#243447',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${
                        download.status === 'error'
                          ? '#f44336'
                          : download.status === 'completed'
                          ? '#4CAF50'
                          : '#66c0f4'
                      }`
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#2a475e',
                        borderRadius: '50%',
                        fontSize: '16px'
                      }}
                    >
                      {download.status === 'error'
                        ? '❌'
                        : download.status === 'completed'
                        ? '✅'
                        : download.status === 'downloading'
                        ? '⬇️'
                        : download.status === 'moving'
                        ? '📦'
                        : download.status === 'checking'
                        ? '🔍'
                        : '⏳'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: '#c6d4df',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {download.name || `Mod ${download.id}`}
                      </div>

                      <div style={{ fontSize: '12px', color: '#8f98a0' }}>
                        {download.status === 'error'
                          ? `Error: ${download.error || 'Unknown error'}`
                          : download.status === 'completed'
                          ? 'Completed'
                          : download.progress < 0 && download.message
                          ? download.message
                          : download.status === 'downloading'
                          ? 'Downloading...'
                          : download.status === 'moving'
                          ? 'Moving files...'
                          : download.status === 'checking'
                          ? 'Checking compatibility...'
                          : 'Pending...'}
                      </div>

                      {/* Progress bar for active downloads (only show if progress >= 0) */}
                      {(download.status === 'downloading' ||
                        download.status === 'moving' ||
                        download.status === 'checking') && download.progress >= 0 && (
                        <div
                          style={{
                            width: '100%',
                            height: '4px',
                            background: '#2a475e',
                            borderRadius: '2px',
                            marginTop: '8px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${download.progress}%`,
                              height: '100%',
                              background:
                                'linear-gradient(90deg, #66c0f4, #4CAF50)',
                              borderRadius: '2px',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Progress percentage - only show if progress >= 0 */}
                    {(download.status === 'downloading' ||
                      download.status === 'moving' ||
                      download.status === 'checking') && download.progress >= 0 && (
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: download.progress < 0 ? '#e6b800' : '#66c0f4',
                          minWidth: '40px',
                          textAlign: 'right'
                        }}
                      >
                        {download.progress}%
                      </div>
                    )}
                    {/* Warning icon for stuck downloads */}
                    {download.progress < 0 && (
                      <div style={{ fontSize: '16px' }}>⚠️</div>
                    )}
                    {/* Cancel button for active downloads */}
                    {(download.status === 'downloading' ||
                      download.status === 'checking' ||
                      download.status === 'moving' ||
                      download.progress < 0) && onCancelDownload && (
                      <button
                        onClick={() => onCancelDownload(download.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #f44336',
                          color: '#f44336',
                          padding: '4px 10px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          whiteSpace: 'nowrap'
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
                        取消
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
