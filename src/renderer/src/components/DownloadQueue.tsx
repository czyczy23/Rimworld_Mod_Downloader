import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { BatchDownloadInfo, DownloadItem, PendingDownloadItem } from '../../../shared/types'
import { AppIcon, type AppIconName } from './AppIcon'

interface DownloadQueueProps {
  downloads: DownloadItem[]
  batchInfo?: BatchDownloadInfo
  pendingQueue: PendingDownloadItem[]
  selectedForDelete: string[]
  onToggleSelectForDelete: (id: string) => void
  onSelectAllForDelete: () => void
  onRequestDelete: (id?: string) => void
  onClearCompleted: () => void
  onClearAll: () => void
}

export function DownloadQueue({
  downloads,
  batchInfo,
  pendingQueue,
  selectedForDelete,
  onToggleSelectForDelete,
  onSelectAllForDelete,
  onRequestDelete,
  onClearCompleted,
  onClearAll
}: DownloadQueueProps) {
  const { t } = useTranslation()
  const activeStatuses = ['connecting', 'downloading', 'checking', 'moving']
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate summary stats
  const activeDownloads = downloads.filter((d) => activeStatuses.includes(d.status))
  const completedDownloads = downloads.filter((d) => d.status === 'completed')
  const errorDownloads = downloads.filter((d) => d.status === 'error')

  // Get status display info
  const getStatusInfo = () => {
    if (activeDownloads.length > 0) {
      const avgProgress = Math.round(
        activeDownloads.reduce((sum, d) => sum + d.progress, 0) / activeDownloads.length
      )
      return {
        text: t('downloadQueue.downloading', { count: activeDownloads.length }),
        progress: avgProgress,
        color: '#66c0f4'
      }
    }
    if (errorDownloads.length > 0) {
      return {
        text: t('downloadQueue.failed', { count: errorDownloads.length }),
        progress: 0,
        color: '#f44336'
      }
    }
    if (completedDownloads.length > 0 && downloads.length > 0) {
      return {
        text: t('downloadQueue.completed', { count: completedDownloads.length }),
        progress: 100,
        color: '#4CAF50'
      }
    }
    return {
      text: t('downloadQueue.ready'),
      progress: 0,
      color: '#8f98a0'
    }
  }

  const statusInfo = getStatusInfo()

  const getDownloadStatusIcon = (
    status: DownloadItem['status']
  ): { name: AppIconName; color: string } => {
    switch (status) {
      case 'error':
        return { name: 'error', color: '#f44336' }
      case 'completed':
        return { name: 'success', color: '#4CAF50' }
      case 'connecting':
        return { name: 'disconnected', color: '#66c0f4' }
      case 'downloading':
        return { name: 'download', color: '#66c0f4' }
      case 'moving':
        return { name: 'app', color: '#66c0f4' }
      case 'checking':
        return { name: 'search', color: '#66c0f4' }
      default:
        return { name: 'waiting', color: '#8f98a0' }
    }
  }

  // Clear completed downloads
  const clearCompleted = () => {
    onClearCompleted()
  }

  // Clear all downloads
  const clearAll = () => {
    onClearAll()
  }

  return (
    <div
      className="download-queue"
      data-testid="download-queue"
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
          <span
            style={{
              fontWeight: 500,
              color: '#c6d4df',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AppIcon name="download" size={18} color="#66c0f4" />
            {t('downloadQueue.queue')}
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
          <span style={{ color: statusInfo.color, fontSize: '13px' }}>{statusInfo.text}</span>

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

          <AppIcon
            name="chevronDown"
            size={16}
            color="#8f98a0"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      color: '#66c0f4',
                      fontSize: '13px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AppIcon name="queue" size={16} />
                    {t('downloadQueue.pendingDownloads')} ({pendingQueue.length})
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
                      {selectedForDelete?.length === pendingQueue.length
                        ? t('downloadQueue.deselectAll')
                        : t('downloadQueue.selectAll')}
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
                      {t('downloadQueue.deleteSelected')} ({selectedForDelete.length})
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingQueue.map((item) => {
                  const isSelected = selectedForDelete?.includes(item.id)
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: isSelected ? '#3a2c47' : '#2a475e',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${isSelected ? '#f44336' : '#e6b800'}`
                      }}
                    >
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
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#1b2838',
                          borderRadius: '50%'
                        }}
                      >
                        <AppIcon name="queue" size={18} color="#e6b800" />
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
                          title={t('downloadQueue.removeFromQueue')}
                        >
                          <AppIcon name="close" size={18} />
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
              <div
                style={{
                  color: '#66c0f4',
                  fontSize: '13px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}
              >
                {t('downloadQueue.batchDownload')} ({batchInfo.current}/{batchInfo.total})
              </div>
              <div
                style={{
                  color: '#c6d4df',
                  fontSize: '12px'
                }}
              >
                {t('downloadQueue.currentDownloading')}: {batchInfo.currentName}
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
              <div
                style={{
                  marginBottom: '16px',
                  opacity: 0.5,
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <AppIcon name="app" size={48} color="#8f98a0" stroke={1.5} />
              </div>
              <p>{t('downloadQueue.noDownloads')}</p>
              <p style={{ fontSize: '13px', color: '#5a6875' }}>
                {'Browse Steam Workshop and click "Download to Local" on any mod'}
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
                      {t('downloadQueue.clearCompleted')}
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
                    {t('downloadQueue.clearAll')}
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
                {downloads.map((download) => {
                  const statusIcon = getDownloadStatusIcon(download.status)
                  return (
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
                          borderRadius: '50%'
                        }}
                      >
                        <AppIcon name={statusIcon.name} size={18} color={statusIcon.color} />
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
                              : download.status === 'connecting'
                                ? 'Connecting to Steam...'
                                : download.status === 'downloading'
                                  ? 'Downloading...'
                                  : download.status === 'moving'
                                    ? 'Moving files...'
                                    : download.status === 'checking'
                                      ? 'Checking compatibility...'
                                      : 'Pending...'}
                        </div>

                        {/* Progress bar for active downloads */}
                        {activeStatuses.includes(download.status) && (
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
                                background: 'linear-gradient(90deg, #66c0f4, #4CAF50)',
                                borderRadius: '2px',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Progress percentage */}
                      {activeStatuses.includes(download.status) && (
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#66c0f4',
                            minWidth: '40px',
                            textAlign: 'right'
                          }}
                        >
                          {download.progress}%
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
