import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  /**
   * Icon to display in the header
   */
  icon?: LucideIcon;
  /**
   * Title of the page
   */
  title: string;
  /**
   * Subtitle/description of the page
   */
  subtitle?: string;
  /**
   * Actions to display on the right side
   */
  actions?: React.ReactNode;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'h-10 border-b border-border flex items-center justify-between px-3 bg-background',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        <div>
          <h1 className="text-xs font-medium text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

PageHeader.displayName = 'PageHeader';
