export default function MediaPreview({ asset, title, placeholder, kind }) {
  const isVideo = kind === 'video' && asset?.src && /\.(mp4|webm|mov|mkv)$/i.test(asset.src);
  return (
    <div className="media-box">
      {isVideo ? (
        <video src={asset.src} controls />
      ) : asset?.src ? (
        <img src={asset.src} alt={asset.name || title || placeholder} />
      ) : (
        <span>{placeholder}</span>
      )}
    </div>
  );
}
