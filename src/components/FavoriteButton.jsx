import React from "react";
import { Heart } from "lucide-react";

const FavoriteButton = ({ item, user, isFavorite, onRequireLogin, onToggle }) => {
  if (!item || !item.id) return null; // safety check

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!user) {
      onRequireLogin?.();
      return;
    }
    onToggle?.(item);
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 bg-white/90 rounded-full hover:bg-white hover:scale-110 transition-all"
    >
      <Heart
        className={`w-5 h-5 transition-colors ${
          isFavorite 
            ? 'fill-red-500 text-red-500' 
            : 'text-muted-foreground'
        }`}
      />
    </button>
  );
};

export default FavoriteButton;
