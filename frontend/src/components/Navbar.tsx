import { useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import LanguageBadge from "./LanguageBadge";
import { getLanguageByValue, languageOptions } from "../languageOptions";
import { socket } from "../socket";
import { RiLogoutBoxLine } from "react-icons/ri";
import { FaFileDownload, FaSave } from "react-icons/fa";
import { GrClearOption } from "react-icons/gr";

type Props = {
    userLang: string;
    setUserLang: (val: string) => void;
    userLangId: number;
    setUserLangId: (val: number) => void;
    userTheme: string;
    setUserTheme: (val: string) => void;
    fontSize: number;
    setFontSize: (val: number) => void;
    handleDownloadCode: () => void;
    handleSaveCode: () => void;
    handleClearEditor: () => void;
};

const themes = [
    { value: "vs-dark", label: "Dark" },
    { value: "light", label: "Light" },
];

export default function Navbar({
    userLang,
    setUserLang,
    setUserLangId,
    userTheme,
    setUserTheme,
    fontSize,
    setFontSize,
    handleDownloadCode,
    handleSaveCode,
    handleClearEditor,
}: Props) {
    const navigate = useNavigate();
    const [themeOpen, setThemeOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
   
    const themeRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    // CLOSE THEME DROPDOWN ON OUTSIDE CLICK
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
                setThemeOpen(false);
            }

            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setLangOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleLeaveRoom = () => {
        socket.disconnect();
        navigate("/");
    };

    const handleLanguageChange = (newLang: string) => {
        const lang = getLanguageByValue(newLang);
        setUserLang(newLang);
        setUserLangId(lang.judge0Id);
        setLangOpen(false);

    };

    const currentThemeLabel = themes.find((t) => t.value === userTheme)?.label ?? "Dark";
    const currentLang = getLanguageByValue(userLang);

    const dropdownBase = `absolute top-full left-0 mt-1.5 z-50
        bg-gray-900 border border-white/10 rounded-lg
        overflow-hidden shadow-xl shadow-black/50`;

    const dropdownBtn = (active: boolean) => `w-full flex items-center gap-2.5 px-3 py-2 text-sm
        transition-colors duration-100 cursor-pointer text-left
        ${active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/6 hover:text-white/90"}`;

    const triggerBtn = `flex items-center justify-between  gap-2 px-3 py-1 rounded-md bg-gray-900
        border border-white/10 text-sm text-white/80
        hover:border-white/20 hover:bg-gray-800
        transition-all duration-150 select-none cursor-pointer`;

    const chevron = (open: boolean) => (
        <svg
            className={`w-3 h-3 text-white/30 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            viewBox="0 0 10 6" fill="none"
        >
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    const checkmark = (
        <svg className="ml-auto w-3.5 h-3.5 text-white/50" viewBox="0 0 14 14" fill="none">
            <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );

    return (
        <div className="flex items-center justify-between bg-gray-900 text-white px-4 py-2 border-b border-white/10">
            <h1 className="text-4xl font-bold tracking-tight">Smart Code Lab</h1>

            <div className="flex items-center gap-4">

                {/* CLEAR EDITOR BUTTON*/}
                <button
                    onClick={handleClearEditor}
                    className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors text-sm"
                >
                    <GrClearOption size={16} /> Clear
                </button>

                {/* DIVIDER */}
                <div className="w-px h-5 bg-white/10" />

                {/* SAVE CODE BUTTON*/}
                <button
                    onClick={handleSaveCode}
                    className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors text-sm"
                >
                    <FaSave size={16} /> Save
                </button>

                {/* DIVIDER */}
                <div className="w-px h-5 bg-white/10" />

                {/* DOWNLOAD CODE BUTTON*/}
                <button
                    onClick={handleDownloadCode}
                    className="flex items-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors text-sm"
                >
                    <FaFileDownload size={16} /> Download Code
                </button>

                {/* DIVIDER */}
                <div className="w-px h-5 bg-white/10" />

                {/* LANGUAGE SELECTOR */}
                <div ref={langRef} className="relative flex items-center gap-2">
                    <LanguageBadge language={userLang} />
                    <button
                        onClick={() => setLangOpen((o) => !o)}
                        className={triggerBtn + " w-30"}
                    >
                        <span>{currentLang.label}</span>
                        {chevron(langOpen)}
                    </button>

                    {langOpen && (
                        <div className={`${dropdownBase} w-46`}>
                            {languageOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleLanguageChange(opt.value)}
                                    className={dropdownBtn(userLang === opt.value)}
                                >
                                    {/* Coloured dot matching the badge */}
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{
                                            background: opt.badge.text.replace("text-", "").includes("-")
                                                ? undefined : opt.badge.text
                                        }}
                                    >
                                        {/* fallback: just render badge label color via Tailwind */}
                                    </span>
                                    <span className={`text-[10px] font-bold w-7 ${opt.badge.text}`}>
                                        {opt.badge.label}
                                    </span>
                                    <span>{opt.label}</span>
                                    {userLang === opt.value && checkmark}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* DIVIDER */}
                <div className="w-px h-5 bg-white/10" />

                {/* THEME SELECTOR */}
                <div ref={themeRef} className="relative">
                    <button
                        onClick={() => setThemeOpen((o) => !o)}
                        className={triggerBtn}
                    >
                        <span className="text-xs">{userTheme === "vs-dark" ? "🌙" : "☀️"}</span>
                        <span>{currentThemeLabel}</span>
                        {chevron(themeOpen)}
                    </button>

                    {/* Custom dropdown — zero browser styling */}
                    {themeOpen && (
                        <div className="absolute top-full left-0 mt-1.5 w-full z-50
                                        bg-gray-900 border border-white/10 rounded-lg
                                        overflow-hidden shadow-xl shadow-black/50">
                            {themes.map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => {
                                        setUserTheme(t.value);
                                        setThemeOpen(false);
                                    }}
                                    className={dropdownBtn(userTheme === t.value)}
                                >
                                    <span className="text-xs">{t.value === "vs-dark" ? "🌙" : "☀️"}</span>
                                    <span>{t.label}</span>
                                    {userTheme === t.value && checkmark}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* DIVIDER */}
                <div className="w-px h-5 bg-white/10" />

                {/* FONT SIZE SLIDER */}
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min={12}
                        max={30}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-20 accent-purple-500 cursor-pointer"
                    />
                    <span className="text-xs text-white/40 w-6 text-center">{fontSize}</span>
                </div>

                {/* DIVIDER */}
                <div className="w-px h-5 bg-white/10" />

                {/* LEAVE BUTTON */}
                <button
                    onClick={handleLeaveRoom}
                    className="flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors text-sm"
                >
                    <RiLogoutBoxLine size={16} />
                    Leave Room
                </button>
            </div>
        </div>
    );
}