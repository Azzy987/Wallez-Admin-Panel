import React from 'react';
import { ImageIcon } from 'lucide-react';
import type { WallezCategoryStat } from '@/lib/firebase';

interface CategoryBreakdownProps {
  categories: WallezCategoryStat[];
  loading?: boolean;
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ categories, loading }) => {
  const maxCount = Math.max(...categories.map((c) => c.count), 1);
  const withContent = categories.filter((c) => c.count > 0);
  const empty = categories.filter((c) => c.count === 0);

  if (loading) {
    return (
      <div className="wallez-glass-panel rounded-2xl p-6 space-y-4">
        <div className="h-5 w-40 rounded bg-muted/60 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    );
  }

  return (
    <div className="wallez-glass-panel rounded-2xl p-6 animate-stagger-in" style={{ animationDelay: '320ms' }}>
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Category fill</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Wallpapers per style category in Firestore
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{withContent.length}</span> active ·{' '}
          <span className="font-semibold text-foreground">{empty.length}</span> empty
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No style categories yet — add them below and sync to Firestore.
        </p>
      ) : (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
          {categories.map((cat, index) => {
            const width = cat.count > 0 ? Math.max(8, (cat.count / maxCount) * 100) : 0;
            return (
              <div
                key={cat.name}
                className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 px-3 py-2.5 transition-colors hover:bg-card/70 hover:border-[#2EE6C5]/20"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                {cat.thumbnail ? (
                  <img
                    src={cat.thumbnail}
                    alt=""
                    className="h-9 w-9 rounded-lg object-cover border shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium truncate">{cat.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                      {cat.count}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2EE6C5] to-primary transition-all duration-700 ease-out group-hover:brightness-110"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryBreakdown;
