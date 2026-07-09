import { Fragment, type CSSProperties } from 'react';
import { type MenuLinkObject } from '../menuData';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function cleanStoryText(value: unknown) {
  return String(value || '').trim();
}

function resolveStoryImageUrl(value?: string) {
  const url = cleanStoryText(value);
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  if (url.startsWith('/api/media/')) return `${API_URL}${url}`;
  return url;
}

function resolveStoryColor(value?: string) {
  const color = cleanStoryText(value).replace(/^#/, '').toLowerCase();
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/.test(color) ? `#${color}` : '';
}

function storyBackgroundStyle(item: MenuLinkObject): CSSProperties | undefined {
  const imageUrl = resolveStoryImageUrl(item.imageUrl);
  if (imageUrl) return { backgroundImage: `url("${imageUrl}")` };

  const backgroundColor = resolveStoryColor(item.backgroundColor);
  if (backgroundColor) return { backgroundColor };

  return undefined;
}

function renderStoryText(text: string) {
  const lines = text.split(/\r?\n/);
  return lines.map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      {index > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

async function getCircleStoryItems(): Promise<MenuLinkObject[]> {
  try {
    const response = await fetch(`${API_URL}/api/menu/header`, { cache: 'no-store' });
    if (!response.ok) return [];

    const payload = await response.json();
    if (!payload?.success || !Array.isArray(payload.data?.circleStory)) return [];

    return payload.data.circleStory;
  } catch {
    return [];
  }
}

export default async function Section2() {
  const circleStoryItems = await getCircleStoryItems();

  return (
    <>
  {/*  START section-2  */}
  <section className="section-2 story-section" id="section-2">
    <div className="story-container" id="storyContainer">
      <div className="story-track" id="storyTrack">

        {circleStoryItems.map((item, index) => {
          const label = cleanStoryText(item.label || item.name);
          const subText = cleanStoryText(item.subText);

          return (
            <div className="story-item" key={item.id || `${label}-${index}`}>
              <div className="story-ring">
                <div className={`story-img-bg img-bg-${(index % 6) + 1}`} style={storyBackgroundStyle(item)}>
                  <span className="story-text-overlay">{renderStoryText(subText)}</span>
                </div>
              </div>
              <p className="story-label">{label}</p>
            </div>
          );
        })}

      </div>
    </div>
  </section>

  {/*  END section-2  */}
    </>
  );
}
