import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'

interface WordBoundary {
  time: number
  energy: number
}

interface AudioPlayerProps {
  src?: string
  title?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
  onWordBoundaries?: (boundaries: WordBoundary[]) => void
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, onTimeUpdate, onPlayStateChange, onWordBoundaries }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const boundariesRef = useRef<WordBoundary[]>([])
  const lastEnergyRef = useRef<number>(0)
  const silenceStartRef = useRef<number | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 初始化音频分析
  const initAudioAnalysis = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audioContextRef.current) return

    try {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8

      const source = audioContext.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(audioContext.destination)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      sourceRef.current = source

      setIsAnalyzing(true)
      startEnergyAnalysis()
    } catch (e) {
      console.error('初始化音频分析失败:', e)
    }
  }, [])

  // 开始能量分析
  const startEnergyAnalysis = useCallback(() => {
    const analyser = analyserRef.current
    const audio = audioRef.current
    if (!analyser || !audio) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const boundaries: WordBoundary[] = []
    let lastBoundaryTime = 0
    const minWordDuration = 0.08 // 最小单词间隔（秒）
    const silenceThreshold = 20 // 静音阈值
    const silenceDuration = 0.05 // 静音持续时间（秒）

    const analyze = () => {
      if (!audio.paused) {
        analyser.getByteFrequencyData(dataArray)

        // 计算当前帧的平均能量
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i]
        }
        const averageEnergy = sum / bufferLength
        const currentTime = audio.currentTime
        const lastEnergy = lastEnergyRef.current

        // 检测能量下降（单词边界）
        const energyDrop = lastEnergy - averageEnergy
        const isSignificantDrop = energyDrop > 15 && averageEnergy < silenceThreshold

        // 检测静音区间
        if (averageEnergy < silenceThreshold) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = currentTime
          } else if (currentTime - silenceStartRef.current >= silenceDuration) {
            // 检测到足够的静音，标记为单词边界
            if (currentTime - lastBoundaryTime >= minWordDuration) {
              boundaries.push({
                time: currentTime,
                energy: averageEnergy
              })
              lastBoundaryTime = currentTime
              silenceStartRef.current = null
            }
          }
        } else if (isSignificantDrop && currentTime - lastBoundaryTime >= minWordDuration) {
          // 检测到能量显著下降，也标记为单词边界
          boundaries.push({
            time: currentTime,
            energy: averageEnergy
          })
          lastBoundaryTime = currentTime
          silenceStartRef.current = null
        } else {
          silenceStartRef.current = null
        }

        lastEnergyRef.current = averageEnergy
      }

      animationFrameRef.current = requestAnimationFrame(analyze)
    }

    analyze()
  }, [])

  // 停止分析并返回结果
  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // 将边界数据传递给父组件
    if (boundariesRef.current.length > 0) {
      onWordBoundaries?.(boundariesRef.current)
    }
  }, [onWordBoundaries])

  // 播放时开始分析
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => {
      if (!audioContextRef.current) {
        initAudioAnalysis()
      } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume()
      }
      startEnergyAnalysis()
    }

    const handlePause = () => {
      // 暂停时不停止分析，等待恢复或结束
    }

    const handleEnded = () => {
      stopAnalysis()
      setIsPlaying(false)
      onPlayStateChange?.(false)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      stopAnalysis()
    }
  }, [initAudioAnalysis, startEnergyAnalysis, stopAnalysis, onPlayStateChange])

  // 清理资源
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const time = audio.currentTime
    const dur = audio.duration
    setCurrentTime(time)
    onTimeUpdate?.(time, dur)
  }, [onTimeUpdate])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [src, handleTimeUpdate])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !src) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      onPlayStateChange?.(false)
    } else {
      audio.play()
      setIsPlaying(true)
      onPlayStateChange?.(true)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const progressBar = progressRef.current
    if (!audio || !progressBar || !duration) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    audio.currentTime = percentage * duration
  }

  const skipBack = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, audio.currentTime - 10)
  }

  const skipForward = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(duration, audio.currentTime + 10)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const newVolume = parseFloat(e.target.value)
    audio.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!src) {
    return (
      <div className="bg-primary-50/60 rounded-clay p-4 border border-primary-100">
        <p className="text-sm text-slate-400 text-center">暂无音频</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-primary-100/60 rounded-clay p-4 border border-primary-100 shadow-clay">
      <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />

      {/* 标题 */}
      {title && (
        <p className="text-xs text-slate-500 mb-3 truncate">{title}</p>
      )}

      {/* 进度条 */}
      <div
        ref={progressRef}
        className="h-2 bg-white rounded-full cursor-pointer mb-3 overflow-hidden shadow-inner"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-300 rounded-full transition-all duration-100"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* 时间显示 */}
      <div className="flex justify-between text-xs text-slate-500 mb-3">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={skipBack}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors text-slate-600"
            title="后退10秒"
          >
            <SkipBack size={16} />
          </button>

          <button
            onClick={togglePlay}
            disabled={!src || isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-500 hover:bg-primary-600 transition-colors text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} className="ml-0.5" />
            )}
          </button>

          <button
            onClick={skipForward}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors text-slate-600"
            title="前进10秒"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* 音量控制 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors text-slate-600"
          >
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-white rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>

      {/* 分析状态 */}
      {isAnalyzing && (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary-500">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
          音频分析中
        </div>
      )}
    </div>
  )
}
