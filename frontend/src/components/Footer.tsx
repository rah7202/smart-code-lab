import { FaGithub } from "react-icons/fa";

export default function Footer({ size = 16, URL }: { size: number, URL: string }) {
    return (
        <footer className="w-full border-white/10 bg-gray-900/80 backdrop-blur px-4 py-2 flex items-center justify-center">
            <a
                href={URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >

                <FaGithub size={size} />
            </a>
        </footer>
    );
}