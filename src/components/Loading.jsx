import React from 'react';

const Loading = ({ message = "Loading...", fullScreen = false, size = "default" }) => {
  const sizeClasses = {
    small: "w-12 h-12",
    default: "w-20 h-20",
    large: "w-32 h-32"
  };

  const textSizeClasses = {
    small: "text-lg",
    default: "text-2xl",
    large: "text-3xl"
  };

  const containerClasses = fullScreen
    ? "fixed inset-0 bg-background flex items-center justify-center z-50"
    : "flex flex-col items-center justify-center py-12 min-h-[40vh]";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-6">
        {/* Logo with bounce animation */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
          <img 
            src="/logo.jpg" 
            alt="Getaways Logo" 
            className={`${sizeClasses[size]} object-contain relative z-10 animate-bounce`}
            style={{ animationDuration: '2s', animationIterationCount: 'infinite' }}
          />
        </div>
        
        {/* Logo Name */}
        <div className="flex flex-col items-center gap-3">
          <span className={`font-heading font-bold text-primary ${textSizeClasses[size]} animate-pulse`}>
            Getaways
          </span>
          
          {/* Loading message */}
          {message && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                {message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Loading;

