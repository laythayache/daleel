import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getItemById } from "@/lib/n-client";

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

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("news");
  const isRTL = locale === "ar";

  const item = await getItemById(id);
  if (!item) notFound();

  const itemRTL = item.language === "ar";
  const catKey = CATEGORY_LABEL_KEY[item.category] ?? "general";
  const catStyle =
    CATEGORY_STYLE[item.category] ?? "bg-gray-50 text-gray-700 border-gray-200";
  const oriStyle = item.politicalOrientation
    ? (ORIENTATION_STYLE[item.politicalOrientation] ??
      "bg-slate-50 text-slate-700 border-slate-200")
    : null;

  const published = new Date(item.publishedAt).toLocaleString(
    locale === "ar" ? "ar-LB" : locale === "fr" ? "fr-FR" : "en-US",
    { dateStyle: "medium", timeStyle: "short" },
  );

  return (
    <div className="min-h-[calc(100dvh-64px)] bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto">
          <Link
            href={`/${locale}/news`}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            ← {isRTL ? "العودة إلى الأخبار" : locale === "fr" ? "Retour aux actualités" : "Back to news"}
          </Link>

          <article
            className={`bg-white border ${item.isWarning ? "border-red-300 ring-1 ring-red-100" : "border-gray-200"} rounded-xl p-5 sm:p-8 shadow-sm`}
          >
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {item.isWarning && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-800 text-xs font-semibold uppercase tracking-wide">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
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
                className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium ${catStyle}`}
              >
                {t(`categories.${catKey}`)}
              </span>
              {oriStyle && (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs ${oriStyle}`}
                >
                  {item.politicalOrientation}
                </span>
              )}
              <span className="text-xs text-gray-400 uppercase tracking-wide ms-auto">
                {item.language}
              </span>
            </div>

            {item.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="w-full max-h-96 object-cover rounded-lg bg-gray-100 mb-5"
              />
            )}

            <div dir={itemRTL ? "rtl" : "ltr"}>
              <h1 className="text-xl sm:text-2xl font-serif font-medium text-gray-900 leading-snug mb-3">
                {item.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-5">
                <span className="font-medium text-gray-700">{item.sourceName}</span>
                <span className="text-gray-300">·</span>
                <time dateTime={item.publishedAt}>{published}</time>
              </div>

              <div className="prose prose-sm sm:prose-base max-w-none text-gray-800 whitespace-pre-wrap">
                {item.body || item.summary}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-cedar font-medium hover:underline"
              >
                {isRTL ? "فتح على Telegram" : locale === "fr" ? "Ouvrir sur Telegram" : "Open on Telegram"}
                ↗
              </a>
              <span className="text-xs text-gray-400">#{item.id}</span>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
