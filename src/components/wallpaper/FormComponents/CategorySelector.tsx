import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PlusCircle, X } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Category } from '@/lib/firebase';
import { isBrandCategory, isStyleCategory, WALLEZ_BRAND_NAME } from '@/lib/wallezCategories';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryChange: (categoryName: string) => void;
  onRemoveCategory: (category: string) => void;
  getSelectedMainCategory: () => string;
  getSelectedBrandCategory: () => string;
  onSubCategoryChange?: (subCategory: string) => void;
  selectedSubCategory?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategories,
  onCategoryChange,
  onRemoveCategory,
  getSelectedMainCategory,
  onSubCategoryChange,
}) => {
  const navigate = useNavigate();
  const styleCategories = categories.filter((cat) => isStyleCategory(cat.categoryName));

  useEffect(() => {
    if (!selectedCategories.includes(WALLEZ_BRAND_NAME)) {
      onCategoryChange(WALLEZ_BRAND_NAME);
    }
  }, [selectedCategories, onCategoryChange]);

  useEffect(() => {
    onSubCategoryChange?.('None');
  }, [getSelectedMainCategory(), onSubCategoryChange]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Category</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          className="h-8 flex items-center gap-1 text-xs"
          onClick={() => navigate('/categories')}
        >
          <PlusCircle className="h-3 w-3" />
          Manage Categories
        </Button>
      </div>
      
      {selectedCategories.filter((cat) => !isBrandCategory(cat)).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedCategories
            .filter((cat) => !isBrandCategory(cat))
            .map((cat) => (
            <div 
              key={cat} 
              className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm flex items-center gap-1"
            >
              {cat}
              <button 
                type="button" 
                onClick={() => onRemoveCategory(cat)}
                className="text-primary/70 hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Pick one style category (e.g. Cute, Liquid Glass, Wild World). Each appears directly in the app category grid.
        </p>
        <RadioGroup
          value={getSelectedMainCategory()}
          onValueChange={onCategoryChange}
          className="flex flex-wrap gap-3"
        >
          {styleCategories.map(category => (
            <div key={category.categoryName} className="flex items-center space-x-2">
              <RadioGroupItem
                value={category.categoryName}
                id={`main-category-${category.categoryName}`}
              />
              <Label htmlFor={`main-category-${category.categoryName}`}>{category.categoryName}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      
      <div className="mt-6 p-3 rounded-lg bg-muted/50 border">
        <p className="text-sm font-medium">Upload destination</p>
        <p className="text-xs text-muted-foreground mt-1">
          All wallpapers save to the <code className="text-xs">Wallez</code> Firestore collection
          automatically — this is not a browsable category in the app.
        </p>
      </div>
    </div>
  );
};

export default CategorySelector;
