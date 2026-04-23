import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Newspaper } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { getLatestItems, type NItem } from "@/lib/n-client";

const CATEGORY_STYLE: Record<string, string> = {
  inzar: "bg-amber-50 text-amber-800 border-amber-200",
  politics: "bg-blue-50 text-blue-800 border-blue-200",
  news: "bg-gray-50 text-gray-700 border-gray-200",
};

const CATEGORY_LABEL_KEY: Record<string, "alert" | "announcement" | "general"> = {
  inzar: "alert",
  politics: "announcement",
  news: "general",
};

function formatRelative(
  iso: string,
  labels: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string },
): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return labels.justNow;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${labels.minutesAgo}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${labels.hoursAgo}`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} ${labels.daysAgo}`;
}

export default async function NewsPreview({ locale }: { locale: string }) {
  const t = await getTranslations("news");
  const isRTL = locale === "ar";

  let items: NItem[] = [];
  try {
    const res = await getLatestItems({ pageSize: 6 });
    items = res.data;
  } catch {
    // Fall through to the "coming soon" state — home page should never fail to
    // render just because the ingestion backend is unreachable.
    items = [];
  }

  const labels = {
    justNow: t("justNow"),
    minutesAgo: t("minutesAgo"),
    hoursAgo: t("hoursAgo"),
    daysAgo: t("daysAgo"),
  };

  return (
    <section className="container mx-auto px-4 pb-16 sm:pb-20 md:pb-24">
      <div className="max-w-5xl mx-auto">
        <SectionHeader icon={Newspaper} title={t("title")} />

        {items.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Newspaper className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {isRTL
                ? "قريباً — الأخبار والتحديثات"
                : locale === "fr"
                  ? "Bientôt — Actualités et mises à jour"
                  : "Coming soon — News & updates"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const itemRTL = item.language === "ar";
                const catKey = CATEGORY_LABEL_KEY[item.category] ?? "general";
                const catStyle =
                  CATEGORY_STYLE[item.category] ??
                  "bg-gray-50 text-gray-700 border-gray-200";
                return (
                  <Link
                    key={item.id}
                    href={`/${locale}/news/${item.id}`}
                    className={`group block bg-white border ${item.isWarning ? "border-red-200 hover:border-red-300 ring-1 ring-red-50" : "border-gray-200 hover:border-cedar/30"} rounded-xl p-4 transition-colors`}
                  >
                    <div className="flex items-center gap-1.5 mb-2 text-xs">
                      {item.isWarning && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-red-200 bg-red-50 text-red-800 font-semibold uppercase tracking-wide">
                          {t("categories.alert")}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border font-medium ${catStyle}`}
                      >
                        {t(`categories.${catKey}`)}
                      </span>
                      <span className="ms-auto text-gray-400">
                        {formatRelative(item.publishedAt, labels)}
                      </span>
                    </div>
                    <h3
                      dir={itemRTL ? "rtl" : "ltr"}
                      className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 group-hover:text-cedar transition-colors"
                    >
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs text-gray-500 truncate">
                      {item.sourceName}
                    </p>
                  </Link>
                );
              })}
            </div>
            <div className="mt-5 text-center">
              <Link
                href={`/${locale}/news`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-cedar hover:underline"
              >
                {isRTL
                  ? "عرض كل الأخبار"
                  : locale === "fr"
                    ? "Voir toutes les actualités"
                    : "See all news"}
                <svg
                  className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
