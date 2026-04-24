import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  url: string;
  title?: string;
}

function getEmbedType(url: string): 'youtube' | 'vimeo' | 'hls' | 'mp4' | 'unknown' {
  if (/youtu\.be\/|youtube\.com\/(watch|embed|shorts)/.test(url)) return 'youtube';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  if (/\.m3u8(\?|$)/.test(url)) return 'hls';
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return 'mp4';
  return 'unknown';
}

function getYoutubeId(url: string): string {
  const m =
    url.match(/youtu\.be\/([^?&]+)/) ||
    url.match(/youtube\.com\/(?:watch\?v=|embed\/|shorts\/)([^?&]+)/);
  return m ? m[1] : '';
}

function getVimeoId(url: string): string {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : '';
}

export default function VideoPlayer({ url, title }: VideoPlayerProps) {
  const type = getEmbedType(url);

  if (type === 'youtube') {
    const id = getYoutubeId(url);
    return (
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ paddingTop: '56.25%', backgroundColor: '#000' }}
      >
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
          title={title || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (type === 'vimeo') {
    const id = getVimeoId(url);
    return (
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ paddingTop: '56.25%', backgroundColor: '#000' }}
      >
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`}
          title={title || 'Video'}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (type === 'hls' || type === 'mp4') {
    return <NativeVideoPlayer url={url} isHls={type === 'hls'} />;
  }

  return (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{
        minHeight: 240,
        backgroundColor: 'var(--color-muted)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <p className="text-sm">Unsupported video URL</p>
    </div>
  );
}

function NativeVideoPlayer({ url, isHls }: { url: string; isHls: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(false);

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({ startLevel: -1 });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError(true);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      } else {
        setError(true);
      }
    } else {
      video.src = url;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [url, isHls]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          minHeight: 240,
          backgroundColor: 'var(--color-muted)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p className="text-sm">Failed to load video</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#000' }}>
      <video
        ref={videoRef}
        className="w-full"
        style={{ maxHeight: 480, display: 'block' }}
        controls
        playsInline
        preload="metadata"
      />
    </div>
  );
}
