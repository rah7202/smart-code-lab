import { describe, it, expect, vi } from "vitest";
import {
    languageOptions,
    getLanguageByValue,
    registerMonacoThemes,
} from "../languageOptions";

describe("languageOptions — data", () => {

    it("exports exactly 4 languages", () => {
        expect(languageOptions).toHaveLength(4);
    });

    it("includes Python, JavaScript, C++, C", () => {
        const values = languageOptions.map((l) => l.value);
        expect(values).toContain("python");
        expect(values).toContain("javascript");
        expect(values).toContain("cpp");
        expect(values).toContain("c");
    });

    it("every language has all required fields", () => {
        for (const lang of languageOptions) {
            expect(lang.label).toBeTruthy();
            expect(lang.value).toBeTruthy();
            expect(lang.monacoLanguage).toBeTruthy();
            expect(lang.monacoTheme).toBeTruthy();
            expect(lang.judge0Id).toBeGreaterThan(0);
            expect(lang.starterCode).toBeTruthy();
            expect(lang.badge.label).toBeTruthy();
            expect(lang.badge.bg).toBeTruthy();
            expect(lang.badge.text).toBeTruthy();
        }
    });

    it("judge0 IDs are correct", () => {
        expect(getLanguageByValue("python").judge0Id).toBe(71);
        expect(getLanguageByValue("javascript").judge0Id).toBe(63);
        expect(getLanguageByValue("cpp").judge0Id).toBe(54);
        expect(getLanguageByValue("c").judge0Id).toBe(50);
    });

    it("badge labels match language short names", () => {
        expect(getLanguageByValue("python").badge.label).toBe("PY");
        expect(getLanguageByValue("javascript").badge.label).toBe("JS");
        expect(getLanguageByValue("cpp").badge.label).toBe("C++");
        expect(getLanguageByValue("c").badge.label).toBe("C");
    });

    it("starter code contains relevant keywords per language", () => {
        expect(getLanguageByValue("python").starterCode).toContain("print");
        expect(getLanguageByValue("javascript").starterCode).toContain("console.log");
        expect(getLanguageByValue("cpp").starterCode).toContain("#include");
        expect(getLanguageByValue("c").starterCode).toContain("#include");
    });

    it("monacoLanguage maps to correct Monaco identifiers", () => {
        expect(getLanguageByValue("python").monacoLanguage).toBe("python");
        expect(getLanguageByValue("javascript").monacoLanguage).toBe("javascript");
        expect(getLanguageByValue("cpp").monacoLanguage).toBe("cpp");
        expect(getLanguageByValue("c").monacoLanguage).toBe("c");
    });

    it("monacoTheme names follow the naming pattern", () => {
        expect(getLanguageByValue("python").monacoTheme).toBe("python-theme");
        expect(getLanguageByValue("javascript").monacoTheme).toBe("js-theme");
        expect(getLanguageByValue("cpp").monacoTheme).toBe("cpp-theme");
        expect(getLanguageByValue("c").monacoTheme).toBe("c-theme");
    });
});

describe("getLanguageByValue", () => {

    it("returns correct language for python", () => {
        const lang = getLanguageByValue("python");
        expect(lang.value).toBe("python");
        expect(lang.label).toBe("Python");
    });

    it("returns correct language for javascript", () => {
        const lang = getLanguageByValue("javascript");
        expect(lang.value).toBe("javascript");
        expect(lang.label).toBe("JavaScript");
    });

    it("returns correct language for cpp", () => {
        const lang = getLanguageByValue("cpp");
        expect(lang.value).toBe("cpp");
        expect(lang.label).toBe("C++");
    });

    it("returns correct language for c", () => {
        const lang = getLanguageByValue("c");
        expect(lang.value).toBe("c");
        expect(lang.label).toBe("C");
    });

    it("falls back to languageOptions[0] (Python) for unknown value", () => {
        const lang = getLanguageByValue("rust");
        expect(lang.value).toBe("python");
    });

    it("falls back to languageOptions[0] for empty string", () => {
        const lang = getLanguageByValue("");
        expect(lang.value).toBe("python");
    });
});

describe("registerMonacoThemes", () => {

    it("calls defineTheme for all 4 language themes", () => {
        const mockMonaco = {
            editor: {
                defineTheme: vi.fn(),
            },
        } as any;

        registerMonacoThemes(mockMonaco);

        expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(4);

        const themeNames = mockMonaco.editor.defineTheme.mock.calls.map(
            (call: any[]) => call[0]
        );
        expect(themeNames).toContain("python-theme");
        expect(themeNames).toContain("js-theme");
        expect(themeNames).toContain("cpp-theme");
        expect(themeNames).toContain("c-theme");
    });

    it("each theme is based on vs-dark", () => {
        const mockMonaco = {
            editor: { defineTheme: vi.fn() },
        } as any;

        registerMonacoThemes(mockMonaco);

        for (const call of mockMonaco.editor.defineTheme.mock.calls) {
            expect(call[1].base).toBe("vs-dark");
            expect(call[1].inherit).toBe(true);
        }
    });

    it("each theme defines editor.background color", () => {
        const mockMonaco = {
            editor: { defineTheme: vi.fn() },
        } as any;

        registerMonacoThemes(mockMonaco);

        for (const call of mockMonaco.editor.defineTheme.mock.calls) {
            expect(call[1].colors["editor.background"]).toBeTruthy();
        }
    });
});