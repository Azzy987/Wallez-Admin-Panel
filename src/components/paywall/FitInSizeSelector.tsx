import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  PAYWALL_FIT_IN_PRESETS,
  type FitInSizeState,
  resolveFitInDimensions,
} from '@/lib/paywallWallpaper';

interface FitInSizeSelectorProps {
  value: FitInSizeState;
  onChange: (value: FitInSizeState) => void;
  idPrefix?: string;
}

const FitInSizeSelector: React.FC<FitInSizeSelectorProps> = ({
  value,
  onChange,
  idPrefix = 'fitin',
}) => {
  const resolved = useMemo(() => resolveFitInDimensions(value), [value]);

  return (
    <div className="space-y-3">
      <Label>fit-in size</Label>
      <RadioGroup
        value={value.presetId}
        onValueChange={(presetId) => {
          const preset = PAYWALL_FIT_IN_PRESETS.find((p) => p.id === presetId);
          if (presetId === 'custom') {
            onChange({ ...value, presetId });
            return;
          }
          if (preset?.dimensions) {
            const [w, h] = preset.dimensions.split('x');
            onChange({
              presetId,
              customWidth: w || value.customWidth,
              customHeight: h || value.customHeight,
            });
          }
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        {PAYWALL_FIT_IN_PRESETS.map((preset) => (
          <div key={preset.id} className="flex items-start space-x-2 rounded-md border p-2">
            <RadioGroupItem value={preset.id} id={`${idPrefix}-${preset.id}`} className="mt-0.5" />
            <Label htmlFor={`${idPrefix}-${preset.id}`} className="cursor-pointer font-normal leading-snug">
              <span className="font-medium">{preset.label}</span>
              {preset.description && (
                <span className="block text-xs text-muted-foreground">{preset.description}</span>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {value.presetId === 'custom' && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor={`${idPrefix}-width`}>Width</Label>
            <Input
              id={`${idPrefix}-width`}
              type="number"
              min={1}
              max={4096}
              value={value.customWidth}
              onChange={(e) => onChange({ ...value, customWidth: e.target.value })}
              className="mt-1"
            />
          </div>
          <span className="pb-2 text-muted-foreground">×</span>
          <div className="flex-1">
            <Label htmlFor={`${idPrefix}-height`}>Height</Label>
            <Input
              id={`${idPrefix}-height`}
              type="number"
              min={1}
              max={4096}
              value={value.customHeight}
              onChange={(e) => onChange({ ...value, customHeight: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {resolved && (
        <p className="text-xs text-muted-foreground">
          CloudFront path: <code className="bg-muted px-1 rounded">/fit-in/{resolved}/</code>
        </p>
      )}
      {value.presetId === 'custom' && !resolved && (
        <p className="text-xs text-destructive">Enter valid width and height (1-4096).</p>
      )}
    </div>
  );
};

export default FitInSizeSelector;
