import React from 'react';
import Layout from '@/components/Layout';
import CategoriesEditorCard from '@/components/CategoriesEditorCard';
import BannersEditorCard from '@/components/BannersEditorCard';

const Categories = () => (
  <Layout>
    <div className="flex flex-col gap-8 pb-10 animate-stagger-in">
      <header>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Categories &amp; Banners</h1>
        <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm sm:text-base">
          Style categories for the iOS grid, plus the home hero carousel — names, thumbnails, sync, and banner slots.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Style categories</h2>
        <CategoriesEditorCard hideTitle />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Home carousel</h2>
        <BannersEditorCard hideTitle />
      </section>
    </div>
  </Layout>
);

export default Categories;
