import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getItems, getLatestItems, type NItem } from "@/lib/n-client";

// Backend enrichment emits three categories: 'inzar' (إنذار / warnings),
// 'politics', 'news'. 'inzar' items are exactly the warning-flagged ones.
const CATEGORY_LABEL_KEY: Record<string, "alert" | "announcement" | "general"> = {
  inzar: "alert",
  politics: "announcement",
  news: "general",
};

const CATEGORY_STYLE: Record<string, string> = {
  inzar: "bg-amber-50 text-amber-800 border-amber-200",
  politics: "bg-blue-50 text-blue-800 border-blue-200",
  news: "bg-gray-50 text-gray-700 border-gray-200",
};

const ORIENTATION_STYLE: Record<string, string> = {
  "pro-March 14": "bg-sky-50 text-sky-700 border-sky-200",
  "pro-Hezbollah": "bg-yellow-50 text-yellow-800 border-yellow-200",
  "pro-Amal": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "pro-FPM": "bg-orange-50 text-orange-700 border-orange-200",
  "left-wing": "bg-rose-50 text-rose-700 border-rose-200",
  independent: "bg-slate-50 text-slate-700 border-slate-200",
  centrist: "bg-indigo-50 text-indigo-700 border-indigo-200",
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

type SearchParams = {
  category?: string;
  language?: string;
  q?: string;
  page?: string;
};

function buildHref(
  locale: string,
  current: SearchParams,
  patch: Partial<SearchParams>,
): string {
  const next = { ...current, ...patch };
  // Clicking a filter chip resets to page 1
  if (patch.category !== undefined || patch.language !== undefined || patch.q !== undefined) {
    delete next.page;
  }
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v && v !== "all") sp.set(k, String(v));
  }
  const query = sp.toString();
  return `/${locale}/news${query ? `?${query}` : ""}`;
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
        active
          ? "bg-cedar text-white border-cedar"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
      }`}
    >
      {children}
    </Link>
  );
}

const PAGE_SIZE = 30;

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("news");
  const isRTL = locale === "ar";

  const category = sp.category && sp.category !== "all" ? sp.category : undefined;
  const language = sp.language && sp.language !== "all" ? sp.language : undefined;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  let items: NItem[] = [];
  let total = 0;
  let totalPages = 1;
  let fetchError: string | null = null;
  const usingFilters = Boolean(category || language || q);
  try {
    const res = usingFilters
      ? await getItems({ page, pageSize: PAGE_SIZE, category, language, q })
      : await getLatestItems({ page, pageSize: PAGE_SIZE });
    items = res.data;
    total = res.total;
    totalPages = res.totalPages;
  } catch (err) {
    fetchError = (err as Error).message;
  }

  const relativeLabels = {
    justNow: t("justNow"),
    minutesAgo: t("minutesAgo"),
    hoursAgo: t("hoursAgo"),
    daysAgo: t("daysAgo"),
  };

  const categoryChips: Array<{ value: string; label: string }> = [
    { value: "all", label: isRTL ? "الكل" : locale === "fr" ? "Tout" : "All" },
    { value: "inzar", label: t("categories.alert") },
    { value: "politics", label: t("categories.announcement") },
    { value: "news", label: t("categories.general") },
  ];
  const langChips: Array<{ value: string; label: string }> = [
    { value: "all", label: isRTL ? "جميع اللغات" : locale === "fr" ? "Toutes" : "All languages" },
    { value: "ar", label: "العربية" },
    { value: "en", label: "English" },
  ];
  const activeCategory = category ?? "all";
  const activeLanguage = language ?? "all";

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] overflow-hidden">
      {/* Hero */}
      <section
        className="flex-shrink-0 border-b border-gray-100 bg-white z-10"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="container mx-auto px-4 py-3 sm:py-5">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-cedar/10 to-cedar/5 text-cedar flex items-center justify-center shadow-sm">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
                  />
                </svg>
              </div>
            </div>
            <div
              className={`flex-1 text-center ${isRTL ? "sm:text-right" : "sm:text-left"}`}
            >
              <h1 className="text-2xl sm:text-3xl font-serif font-medium text-gray-900 mb-1.5">
                {t("title")}
              </h1>
              <p className="text-sm sm:text-base text-cedar font-medium">
                {t("subtitle")}
              </p>
              {total > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {total.toLocaleString()}
                  {usingFilters ? (isRTL ? " نتيجة" : locale === "fr" ? " résultats" : " results") : (isRTL ? " عنصر" : locale === "fr" ? " éléments" : " items")}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-xs text-gray-600 uppercase tracking-wide font-medium">
                Live
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section
        className="flex-shrink-0 border-b border-gray-100 bg-white"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-2">
            {categoryChips.map((c) => (
              <Chip
                key={c.value}
                href={buildHref(locale, sp, { category: c.value })}
                active={activeCategory === c.value}
              >
                {c.value === "inzar" && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {c.label}
              </Chip>
            ))}
            <span className="mx-2 h-5 w-px bg-gray-200" aria-hidden />
            {langChips.map((l) => (
              <Chip
                key={l.value}
                href={buildHref(locale, sp, { language: l.value })}
                active={activeLanguage === l.value}
              >
                {l.label}
              </Chip>
            ))}
            {usingFilters && (
              <Link
                href={`/${locale}/news`}
                className="ms-auto text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {isRTL ? "مسح الفلاتر" : locale === "fr" ? "Effacer" : "Clear"}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Feed */}
      <section className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="max-w-5xl mx-auto">
            {fetchError ? (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Failed to load news feed</p>
                <p className="opacity-80">{fetchError}</p>
                <p className="opacity-60 mt-2 text-xs">
                  Check that the Daleel backend is running and reachable at{" "}
                  {process.env.NEXT_PUBLIC_DALEEL_API_URL ??
                    "http://localhost:3000"}
                  .
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z"
                    />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg">
                  {isRTL
                    ? "لا توجد أخبار متاحة حالياً"
                    : locale === "fr"
                      ? "Aucune actualité disponible pour le moment"
                      : "No news available at the moment"}
                </p>
              </div>
            ) : (
              <>
                <ul className="grid gap-3 sm:gap-4">
                  {items.map((item) => {
                    const itemRTL = item.language === "ar";
                    const catKey = CATEGORY_LABEL_KEY[item.category] ?? "general";
                    const catStyle =
                      CATEGORY_STYLE[item.category] ??
                      "bg-gray-50 text-gray-700 border-gray-200";
                    const oriStyle = item.politicalOrientation
                      ? (ORIENTATION_STYLE[item.politicalOrientation] ??
                        "bg-slate-50 text-slate-700 border-slate-200")
                      : null;
                    return (
                      <li key={item.id}>
                        <article
                          className={`bg-white border ${item.isWarning ? "border-red-300 shadow-sm ring-1 ring-red-100" : "border-gray-200"} rounded-lg p-4 sm:p-5 hover:border-gray-300 transition-colors`}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrl}
                                alt=""
                                loading="lazy"
                                className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-md object-cover bg-gray-100"
                              />
                            ) : null}
                            <div
                              className="flex-1 min-w-0"
                              dir={itemRTL ? "rtl" : "ltr"}
                            >
                              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                {item.isWarning && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-red-200 bg-red-50 text-red-800 text-xs font-semibold uppercase tracking-wide">
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    {t("categories.alert")}
                                  </span>
                                )}
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${catStyle}`}
                                >
                                  {t(`categories.${catKey}`)}
                                </span>
                                {oriStyle && (
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs ${oriStyle}`}
                                  >
                                    {item.politicalOrientation}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400 uppercase tracking-wide">
                                  {item.language}
                                </span>
                                <span className="text-xs text-gray-400">·</span>
                                <span className="text-xs text-gray-500">
                                  {formatRelative(item.publishedAt, relativeLabels)}
                                </span>
                              </div>
                              <Link
                                href={`/${locale}/news/${item.id}`}
                                className="block group"
                              >
                                <h3 className="text-sm sm:text-base font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-cedar transition-colors">
                                  {item.title}
                                </h3>
                                {item.summary && item.summary !== item.title && (
                                  <p className="text-xs sm:text-sm text-gray-600 mt-1.5 line-clamp-3">
                                    {item.summary}
                                  </p>
                                )}
                              </Link>
                              <div className="flex items-center justify-between mt-2.5 gap-2">
                                <span className="text-xs text-gray-500 truncate">
                                  {item.sourceName}
                                </span>
                                <div className="flex-shrink-0 flex items-center gap-3">
                                  <a
                                    href={item.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    {isRTL ? "المصدر" : locale === "fr" ? "Source" : "Source"} ↗
                                  </a>
                                  <Link
                                    href={`/${locale}/news/${item.id}`}
                                    className="text-xs text-cedar font-medium hover:underline"
                                  >
                                    {t("readMore")} →
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav
                    className="mt-6 flex items-center justify-between"
                    aria-label="Pagination"
                  >
                    {page > 1 ? (
                      <Link
                        href={buildHref(locale, sp, { page: String(page - 1) })}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
                      >
                        ← {isRTL ? "السابق" : locale === "fr" ? "Précédent" : "Previous"}
                      </Link>
                    ) : (
                      <span />
                    )}
                    <span className="text-sm text-gray-500">
                      {isRTL
                        ? `${page} من ${totalPages}`
                        : locale === "fr"
                          ? `${page} sur ${totalPages}`
                          : `Page ${page} of ${totalPages}`}
                    </span>
                    {page < totalPages ? (
                      <Link
                        href={buildHref(locale, sp, { page: String(page + 1) })}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {isRTL ? "التالي" : locale === "fr" ? "Suivant" : "Next"} →
                      </Link>
                    ) : (
                      <span />
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
