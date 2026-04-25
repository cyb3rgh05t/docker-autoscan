import { type ElementType, type ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  icon: ElementType;
  actions?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-copy">
        <h1 className="page-title">
          <Icon size={20} className="page-title-icon" />
          {title}
        </h1>
        {subtitle ? <p className="text-small">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  );
}
