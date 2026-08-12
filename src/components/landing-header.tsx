"use client";

import Link from "next/link";
import { Menu, X, Layers } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "#features", label: "Recursos" },
  { href: "#phases", label: "Roadmap" },
  { href: "#how", label: "Como funciona" },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" onClick={closeMenu}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-600/30">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">BuildForge</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex dark:text-slate-300">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-indigo-600 dark:hover:text-indigo-400">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
          >
            Acessar plataforma
          </Link>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 shadow-lg md:hidden dark:border-slate-800 dark:bg-slate-950">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={closeMenu}
              className="mt-2 rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500"
            >
              Entrar na plataforma
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
