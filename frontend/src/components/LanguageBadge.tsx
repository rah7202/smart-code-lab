import { getLanguageByValue } from "../languageOptions";

interface LanguageBadgeProps {
    language: string; // e.g. "python", "javascript", "cpp", "c"
}

export default function LanguageBadge({ language }: LanguageBadgeProps) {
    const lang = getLanguageByValue(language);

    return (
        <span
            className={`
                    inline-flex items-center gap-1.5 px-2 py-1
                    rounded-md text-xs font-semibold tracking-wide
                    border border-white/10
                    ${lang.badge.bg} ${lang.badge.text}
                    transition-all duration-300 h-7.5
      `}
        >
            {/* Colored dot */}
            <span
                className={`w-1.5 h-1.5 rounded-full ${lang.badge.text} opacity-80`}
                style={{ backgroundColor: "currentColor" }}
            />
            {lang.badge.label}
        </span>
    );
}