"use client";

import Link from "next/link";

export interface MobileCardField {
  label: string;
  value: React.ReactNode;
}

export interface MobileCardItem {
  key: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  fields: MobileCardField[];
  actions?: React.ReactNode;
  href?: string;
  image?: string;
}

interface MobileCardListProps {
  items: MobileCardItem[];
}

export function MobileCardList({ items }: MobileCardListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => {
        const cardContent = (
          <div className="rounded-xl border border-[#F3D9C7] bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800">{item.title}</p>
              {item.badge}
            </div>
            {item.image && (
              <img src={item.image} alt={typeof item.title === "string" ? item.title : ""} className="mt-2 h-12 w-12 rounded-lg object-cover" />
            )}
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              {item.fields.map((field, idx) => (
                <p key={idx}>
                  <span className="text-gray-400">{field.label}:</span> {field.value}
                </p>
              ))}
            </div>
            {item.actions && <div className="mt-3 grid grid-cols-3 gap-2">{item.actions}</div>}
          </div>
        );

        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              className="block min-h-11"
            >
              {cardContent}
            </Link>
          );
        }

        return <div key={item.key}>{cardContent}</div>;
      })}
    </div>
  );
}
