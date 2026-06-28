import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DashboardStatCard from '@/components/dashboard/DashboardStatCard';
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown';
import QuickActions from '@/components/dashboard/QuickActions';
import { getWallezDashboardStats, WallezDashboardStats } from '@/lib/firebase';
import { Download, Eye, Home, Sparkles, Layers, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const emptyStats: WallezDashboardStats = {
  homeWallpapers: 0,
  totalDownloads: 0,
  totalViews: 0,
  styleCategories: 0,
  categoriesWithContent: 0,
  depthEffectCount: 0,
  exclusiveCount: 0,
  categoryBreakdown: [],
};

const Index = () => {
  const [stats, setStats] = useState<WallezDashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getWallezDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <Layout>
      <div className="flex flex-col gap-8 pb-10">
        {/* Hero */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-stagger-in">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-[#2EE6C5]/40 text-[#2EE6C5] bg-[#2EE6C5]/10 text-[10px] uppercase tracking-widest">
                Wallez Admin
              </Badge>
              {!loading && stats.categoriesWithContent > 0 ? (
                <Badge variant="secondary" className="text-[10px]">
                  {stats.categoriesWithContent} categories live
                </Badge>
              ) : null}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1.5 max-w-lg text-sm sm:text-base">
              Home feed stats — Trending & Popular sort automatically in the app by views and downloads.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 self-start sm:self-auto"
            disabled={refreshing}
            onClick={() => loadDashboard(true)}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </header>

        {/* Primary metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <DashboardStatCard
            label="Home feed"
            value={stats.homeWallpapers}
            hint="Wallez collection · single library for the app"
            icon={<Home className="h-5 w-5" />}
            loading={loading}
            delay={0}
            accent="teal"
          />
          <DashboardStatCard
            label="Downloads"
            value={stats.totalDownloads}
            hint="Popular filter sorts by this (all-time saves)"
            icon={<Download className="h-5 w-5" />}
            loading={loading}
            delay={60}
            accent="violet"
          />
          <DashboardStatCard
            label="Views"
            value={stats.totalViews}
            hint="Trending filter sorts by this (all-time opens)"
            icon={<Eye className="h-5 w-5" />}
            loading={loading}
            delay={120}
            accent="sky"
          />
        </section>

        {/* Secondary chips */}
        <section
          className="flex flex-wrap gap-2 animate-stagger-in"
          style={{ animationDelay: '240ms' }}
        >
          {[
            { icon: Sparkles, label: `${stats.styleCategories} style categories` },
            { icon: Layers, label: `${stats.depthEffectCount} depth effect` },
            { icon: Zap, label: `${stats.exclusiveCount} exclusive` },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 backdrop-blur-sm px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[#2EE6C5]/30 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-[#2EE6C5]" />
              {loading ? '…' : label}
            </div>
          ))}
        </section>

        {/* Actions + breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
              Quick actions
            </h2>
            <QuickActions />
          </div>
          <div className="lg:col-span-3">
            <CategoryBreakdown categories={stats.categoryBreakdown} loading={loading} />
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
