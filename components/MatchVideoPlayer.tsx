'use client'

import { embedUrl, storagePathFromUrl } from '@/lib/video'

export default function MatchVideoPlayer({ url }: { url: string }) {
  const embed = embedUrl(url)
  const isUploaded = storagePathFromUrl(url) != null

  return (
    <div className="space-y-2">
      {embed ? (
        <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            src={embed}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="วิดีโอแมตช์"
          />
        </div>
      ) : (
        <video src={url} controls preload="metadata" playsInline className="w-full max-h-[70vh] rounded-lg bg-black" />
      )}
      <div className="flex flex-wrap gap-2">
        {isUploaded ? (
          // Supabase serves Content-Disposition: attachment when ?download is set,
          // which works cross-origin unlike the <a download> attribute.
          <a
            href={`${url}?download=`}
            className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition"
          >
            ⬇ ดาวน์โหลดวิดีโอ
          </a>
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition"
          >
            ↗ เปิดลิงก์ต้นทาง
          </a>
        )}
      </div>
    </div>
  )
}
