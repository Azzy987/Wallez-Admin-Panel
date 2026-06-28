import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ImagePlus, Pencil, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  {
    to: '/add-wallpaper',
    label: 'Upload wallpaper',
    description: 'Add to the home feed library',
    icon: ImagePlus,
    accent: 'from-[#2EE6C5]/20 to-transparent border-[#2EE6C5]/30',
  },
  {
    to: '/edit-wallpaper',
    label: 'Edit library',
    description: 'Update or remove existing',
    icon: Pencil,
    accent: 'from-primary/20 to-transparent border-primary/30',
  },
  {
    to: '/categories',
    label: 'Categories & banners',
    description: 'Grid categories + home carousel',
    icon: Grid3X3,
    accent: 'from-violet-500/20 to-transparent border-violet-500/30',
  },
];

const QuickActions: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-stagger-in" style={{ animationDelay: '180ms' }}>
    {actions.map(({ to, label, description, icon: Icon, accent }) => (
      <Link
        key={to}
        to={to}
        className={cn(
          'group relative flex items-center gap-4 rounded-2xl border bg-gradient-to-br p-4',
          'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
          accent
        )}
      >
        <div className="rounded-xl bg-background/60 p-2.5 transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
      </Link>
    ))}
  </div>
);

export default QuickActions;
