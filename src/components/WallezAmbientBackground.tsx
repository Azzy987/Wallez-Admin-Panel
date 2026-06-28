import React from 'react';

/** Matches the iOS app ambient teal glow + neutral gradient base. */
const WallezAmbientBackground: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
    <div className="absolute inset-0 wallez-page-base" />
    <div className="absolute -top-32 -right-24 h-[520px] w-[520px] rounded-full bg-[#2EE6C5]/[0.12] blur-[100px] animate-wallez-glow" />
    <div
      className="absolute -bottom-40 -left-32 h-[440px] w-[440px] rounded-full bg-[#2EE6C5]/[0.08] blur-[90px] animate-wallez-glow"
      style={{ animationDelay: '1.2s' }}
    />
    <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[80px] animate-wallez-glow-slow" />
  </div>
);

export default WallezAmbientBackground;
