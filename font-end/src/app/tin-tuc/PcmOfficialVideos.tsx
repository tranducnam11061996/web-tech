'use client';

import { useState } from 'react';
import ProgressiveImage from '../../components/ProgressiveImage';
import type { YoutubeChannelPayload } from '../../lib/news';

export default function PcmOfficialVideos({ youtube }: { youtube: YoutubeChannelPayload }) {
  const [selectedVideoId, setSelectedVideoId] = useState(youtube.videos[0]?.videoId || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const selectedVideo = youtube.videos.find((video) => video.videoId === selectedVideoId) || youtube.videos[0];

  if (!selectedVideo) {
    return (
      <div data-pcm-youtube-unavailable className="flex min-h-[260px] items-center justify-center rounded-xl border border-[#1a1a1e] bg-[#0d0d10] px-6 text-center text-sm text-gray-500">
        {youtube.available ? 'Chưa có video mới từ PCM Official.' : 'Không thể tải video PCM Official lúc này.'}
      </div>
    );
  }

  return (
    <div data-pcm-youtube className="flex flex-col lg:flex-row bg-[#0d0d10] border border-[#1a1a1e] rounded-xl overflow-hidden">
      <div className="lg:w-[65%] bg-black relative">
        <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-black relative overflow-hidden">
          {isPlaying ? (
            <iframe
              data-pcm-youtube-player
              className="absolute inset-0 h-full w-full border-0"
              src={`https://www.youtube-nocookie.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0`}
              title={selectedVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <>
              <ProgressiveImage
                src={selectedVideo.thumbnailUrl}
                alt={selectedVideo.title}
                fallbackText="PCM Official"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                aria-label={`Phát video ${selectedVideo.title}`}
                className="relative w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl cursor-pointer hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.5)] pl-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span aria-hidden="true">▶</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="lg:w-[35%] bg-[#111115] flex flex-col">
        <div className="p-4 border-b border-[#1a1a1e]">
          <h4 className="font-bold text-sm text-white">Danh sách phát</h4>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1">
          {youtube.videos.map((video) => {
            const isActive = video.videoId === selectedVideo.videoId;
            return (
              <button
                data-pcm-youtube-playlist-item
                key={video.videoId}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setSelectedVideoId(video.videoId);
                  setIsPlaying(false);
                }}
                className={`w-full text-left flex gap-[12px] p-[12px] cursor-pointer rounded-[8px] transition-colors duration-200 hover:bg-[#1a1a1e] focus-visible:outline-2 focus-visible:outline-blue-400 ${isActive ? 'bg-[#1a1a1e]' : ''}`}
              >
                <span className="w-[120px] shrink-0 aspect-video bg-black rounded-[6px] relative overflow-hidden bg-gradient-to-r from-blue-900 to-purple-900">
                  <ProgressiveImage src={video.thumbnailUrl} alt="" fallbackText="" className="absolute inset-0 h-full w-full object-cover" />
                </span>
                <span className="flex-1">
                  <span className={`text-[13px] line-clamp-2 leading-snug ${isActive ? 'font-bold text-white' : 'font-medium text-gray-300'}`}>{video.title}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
