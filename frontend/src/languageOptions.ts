export interface LanguageOption {
    label: string;
    value: string;
    monacoLanguage: string;     // Monaco editor language id
    monacoTheme: string;        // Monaco theme to apply
    badge: {
        bg: string;             // Tailwind bg class
        text: string;           // Tailwind text class
        label: string;          // Short badge label
    };
    judge0Id: number;           // Judge0 language id (keep your existing mapping)
    starterCode: string;        // Starter code for the language
}

export const languageOptions: LanguageOption[] = [
    {
        label: "Python",
        value: "python",
        monacoLanguage: "python",
        monacoTheme: "python-theme",
        badge: { bg: "bg-blue-500/15", text: "text-blue-400", label: "PY" },
        judge0Id: 71,
        starterCode: "print('Welcome to Smart Code Lab!')",
    },
    {
        label: "JavaScript",
        value: "javascript",
        monacoLanguage: "javascript",
        monacoTheme: "js-theme",
        badge: { bg: "bg-yellow-400/15", text: "text-yellow-400", label: "JS" },
        judge0Id: 63,
        starterCode: "console.log('Welcome to Smart Code Lab!');",
    },
    {
        label: "C++",
        value: "cpp",
        monacoLanguage: "cpp",
        monacoTheme: "cpp-theme",
        badge: { bg: "bg-purple-500/15", text: "text-purple-400", label: "C++" },
        judge0Id: 54,
        starterCode: `#include <iostream>
using namespace std;

int main() {
    cout << "Welcome to Smart Code Lab!" << endl;
    return 0;
}`,
    },
    {
        label: "C",
        value: "c",
        monacoLanguage: "c",
        monacoTheme: "c-theme",
        badge: { bg: "bg-teal-500/15", text: "text-teal-400", label: "C" },
        judge0Id: 50,
        starterCode: `#include <stdio.h>

int main() {
    printf("Welcome to Smart Code Lab!\\n");
    return 0;
}`,
    },
];

// Register custom Monaco themes — call this once after Monaco loads
export function registerMonacoThemes(monaco: typeof import("monaco-editor")) {
    // Python — deep blue tones
    monaco.editor.defineTheme("python-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "569cd6", fontStyle: "bold" },
            { token: "string", foreground: "ce9178" },
            { token: "comment", foreground: "6a9955", fontStyle: "italic" },
            { token: "number", foreground: "b5cea8" },
            { token: "identifier", foreground: "9cdcfe" },
            { token: "type", foreground: "4ec9b0" },
        ],
        colors: {
            "editor.background": "#0d1117",
            "editor.foreground": "#c9d1d9",
            "editor.lineHighlightBackground": "#161b22",
            "editorLineNumber.foreground": "#3d444d",
            "editorLineNumber.activeForeground": "#569cd6",
            "editor.selectionBackground": "#264f7840",
            "editorCursor.foreground": "#569cd6",
        },
    });

    // JavaScript — warm amber tones
    monaco.editor.defineTheme("js-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "f7c948", fontStyle: "bold" },
            { token: "string", foreground: "a8c8a0" },
            { token: "comment", foreground: "6a9955", fontStyle: "italic" },
            { token: "number", foreground: "e06c75" },
            { token: "identifier", foreground: "e5c07b" },
            { token: "type", foreground: "61afef" },
        ],
        colors: {
            "editor.background": "#0f0e07",
            "editor.foreground": "#abb2bf",
            "editor.lineHighlightBackground": "#1a190e",
            "editorLineNumber.foreground": "#4b4a3a",
            "editorLineNumber.activeForeground": "#f7c948",
            "editor.selectionBackground": "#f7c94820",
            "editorCursor.foreground": "#f7c948",
        },
    });

    // C++ — purple tones
    monaco.editor.defineTheme("cpp-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "c792ea", fontStyle: "bold" },
            { token: "string", foreground: "c3e88d" },
            { token: "comment", foreground: "546e7a", fontStyle: "italic" },
            { token: "number", foreground: "f78c6c" },
            { token: "identifier", foreground: "eeffff" },
            { token: "type", foreground: "ffcb6b" },
        ],
        colors: {
            "editor.background": "#0a0010",
            "editor.foreground": "#eeffff",
            "editor.lineHighlightBackground": "#130025",
            "editorLineNumber.foreground": "#3d3050",
            "editorLineNumber.activeForeground": "#c792ea",
            "editor.selectionBackground": "#c792ea20",
            "editorCursor.foreground": "#c792ea",
        },
    });

    // C — teal tones
    monaco.editor.defineTheme("c-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "keyword", foreground: "4ec9b0", fontStyle: "bold" },
            { token: "string", foreground: "ce9178" },
            { token: "comment", foreground: "6a9955", fontStyle: "italic" },
            { token: "number", foreground: "b5cea8" },
            { token: "identifier", foreground: "9cdcfe" },
            { token: "type", foreground: "4ec9b0" },
        ],
        colors: {
            "editor.background": "#030d0c",
            "editor.foreground": "#d4e8e6",
            "editor.lineHighlightBackground": "#071a17",
            "editorLineNumber.foreground": "#1e3d38",
            "editorLineNumber.activeForeground": "#4ec9b0",
            "editor.selectionBackground": "#4ec9b020",
            "editorCursor.foreground": "#4ec9b0",
        },
    });
}

export function getLanguageByValue(value: string): LanguageOption {
    return (
        languageOptions.find((l) => l.value === value) ?? languageOptions[0]
    );
}