'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import {
  Library, BookOpen, Languages, PenTool, ChevronRight,
  Search, Grid3X3, FileText, Lightbulb, Globe, Headphones,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────

type CategoryId = 'grammar' | 'radicals' | 'vocabulary' | 'tools' | 'culture';

interface ResourceItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  externalHref?: string;
  tags: string[];
}

// ─── Data ───────────────────────────────────────────────────────────────

const CATEGORIES: { id: CategoryId; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'grammar', label: 'Grammaire', icon: PenTool, color: 'bg-violet-50 text-violet-600' },
  { id: 'radicals', label: 'Radicaux & Caracteres', icon: Languages, color: 'bg-sky-50 text-sky-600' },
  { id: 'vocabulary', label: 'Vocabulaire', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600' },
  { id: 'tools', label: 'Outils d\'etude', icon: Lightbulb, color: 'bg-amber-50 text-amber-600' },
  { id: 'culture', label: 'Culture & Contexte', icon: Globe, color: 'bg-rose-50 text-rose-600' },
];

const RESOURCES: Record<CategoryId, ResourceItem[]> = {
  grammar: [
    {
      title: 'Points de grammaire par niveau',
      description: 'Tous les points de grammaire HSK 1 a 6, classes par difficulte avec exemples et erreurs courantes.',
      icon: PenTool,
      href: '/courses',
      tags: ['HSK 1-6', 'Exercices'],
    },
    {
      title: 'Structure des phrases chinoises',
      description: 'SVO, sujet-temps-lieu, position des adverbes, construction avec 把/被/把字句.',
      icon: Grid3X3,
      tags: ['Structure', 'Syntaxe'],
    },
    {
      title: 'Particules modales (了/过/着)',
      description: 'Guide complet des particules aspectuelles : quand et comment utiliser 了, 过, et 着.',
      icon: FileText,
      tags: ['Particules', 'HSK 2+'],
    },
    {
      title: 'Complements resultatifs et directionnels',
      description: '动词 + 结果补语/趋向补语 — les patterns essentiels avec exemples.',
      icon: FileText,
      tags: ['Complements', 'HSK 3+'],
    },
    {
      title: 'Conjonctions et connecteurs',
      description: '虽然...但是, 因为...所以, 不但...而且, 既然...就 — tous les connecteurs logiques.',
      icon: FileText,
      tags: ['Connecteurs', 'HSK 3+'],
    },
  ],
  radicals: [
    {
      title: '214 radicaux Kangxi',
      description: 'Liste complete des 214 radicaux avec signification, variantes et exemples de caracteres.',
      icon: Languages,
      tags: ['Radicaux', 'Reference'],
    },
    {
      title: 'Radicaux les plus frequents (top 50)',
      description: 'Les 50 radicaux les plus utilises : 人亻, 口, 日, 月, 木, 水氵, 火灬, 土, 手扌, etc.',
      icon: Grid3X3,
      tags: ['Frequence', 'Debutant'],
    },
    {
      title: 'Regles de l\'ordre des traits',
      description: 'Les 8 regles d\'ecriture : haut avant bas, gauche avant droite, horizontal avant vertical, etc.',
      icon: PenTool,
      tags: ['Ecriture', 'Traits'],
    },
    {
      title: 'Cles phonetiques',
      description: 'Composants phonetiques qui aident a deviner la prononciation d\'un caractere inconnu.',
      icon: Headphones,
      tags: ['Phonetique', 'Intermediaire'],
    },
    {
      title: 'Caracteres par nombre de traits',
      description: 'Index des caracteres HSK classes par nombre de traits : 1-5, 6-10, 11-15, 16+.',
      icon: FileText,
      tags: ['Index', 'Traits'],
    },
  ],
  vocabulary: [
    {
      title: 'Vocabulaire HSK par theme',
      description: 'Listes thematiques : famille, nourriture, transport, meteo, travail, emotions, etc.',
      icon: BookOpen,
      href: '/courses',
      tags: ['Thematique', 'HSK 1-6'],
    },
    {
      title: 'Faux-amis et confusions courantes',
      description: '会/能/可以, 知道/认识/了解, 说/讲/谈 — les mots souvent confondus.',
      icon: FileText,
      tags: ['Confusions', 'HSK 2+'],
    },
    {
      title: 'Classificateurs (量词) essentiels',
      description: '个, 只, 条, 张, 本, 把, 辆, 件 — les 30 classificateurs les plus utilises.',
      icon: Grid3X3,
      tags: ['Classificateurs', 'HSK 1+'],
    },
    {
      title: 'Expressions idiomatiques (成语)',
      description: '50 chengyu essentiels pour HSK 4-6 avec explications et contexte d\'utilisation.',
      icon: Lightbulb,
      tags: ['Chengyu', 'HSK 4+'],
    },
  ],
  tools: [
    {
      title: 'Revisions SRS',
      description: 'Repetition espacee : revisez les mots au bon moment avec l\'algorithme SM-2.',
      icon: Lightbulb,
      href: '/revisions',
      tags: ['SRS', 'Quotidien'],
    },
    {
      title: 'Examens blancs',
      description: 'Simulez l\'examen dans les conditions reelles avec chronometre et analyse detaillee.',
      icon: FileText,
      href: '/mock-exams',
      tags: ['Examen', 'Pratique'],
    },
    {
      title: 'Defi quotidien',
      description: '10 questions par jour adaptees a votre niveau depuis votre Memoire Vivante.',
      icon: Lightbulb,
      href: '/daily-challenge',
      tags: ['Quotidien', 'Adaptatif'],
    },
    {
      title: 'Pratique des caracteres',
      description: 'Entrainement a l\'ecriture des caracteres avec reconnaissance de traits.',
      icon: PenTool,
      href: '/courses',
      tags: ['Ecriture', 'Pratique'],
    },
  ],
  culture: [
    {
      title: 'Systeme des tons',
      description: 'Maitriser les 4 tons (+ton neutre) : exercices de discrimination et regles de sandhi.',
      icon: Headphones,
      tags: ['Tons', 'Prononciation'],
    },
    {
      title: 'Formules de politesse',
      description: '您好, 请问, 不好意思, 谢谢 — les formules essentielles pour chaque situation.',
      icon: Globe,
      tags: ['Politesse', 'Culture'],
    },
    {
      title: 'Format de l\'examen HSK 2026',
      description: 'Structure, duree, nombre de questions et seuil de reussite pour chaque niveau.',
      icon: FileText,
      tags: ['Examen', 'Format'],
    },
  ],
};

// ─── Main Component ─────────────────────────────────────────────────────

export function ResourcesView() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('grammar');
  const [search, setSearch] = useState('');

  const resources = RESOURCES[activeCategory] ?? [];
  const filtered = search
    ? resources.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : resources;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
            <Library className="h-5 w-5 text-navy-700" />
          </div>
          Ressources
        </h1>
        <p className="text-navy-400 mt-2 ml-[52px]">
          Fiches de reference, guides et outils pour votre preparation
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
        <input
          type="text"
          placeholder="Rechercher une ressource..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-200 bg-white text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              activeCategory === cat.id
                ? 'bg-teal-500 text-white shadow-sm'
                : 'bg-cream-50 text-navy-500 hover:bg-cream-100'
            )}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Resource cards */}
      <div className="space-y-3">
        {filtered.map((resource, i) => {
          const Wrapper = resource.href
            ? ({ children, className }: { children: React.ReactNode; className: string }) => (
                <Link href={resource.href!} className={className}>{children}</Link>
              )
            : resource.externalHref
              ? ({ children, className }: { children: React.ReactNode; className: string }) => (
                  <a href={resource.externalHref!} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
                )
              : ({ children, className }: { children: React.ReactNode; className: string }) => (
                  <div className={className}>{children}</div>
                );

          return (
            <Wrapper
              key={i}
              className={cn(
                'block rounded-xl border border-cream-100 bg-white p-4 transition-all',
                (resource.href || resource.externalHref) && 'hover:shadow-md hover:border-teal-200 cursor-pointer group'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
                  CATEGORIES.find(c => c.id === activeCategory)?.color ?? 'bg-cream-50 text-navy-500'
                )}>
                  <resource.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-navy-900 group-hover:text-teal-600 transition-colors">
                      {resource.title}
                    </h3>
                    {resource.externalHref && <ExternalLink className="h-3 w-3 text-navy-300" />}
                  </div>
                  <p className="text-xs text-navy-400 mt-1 line-clamp-2">{resource.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {resource.tags.map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-cream-50 text-navy-500 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {(resource.href || resource.externalHref) && (
                  <ChevronRight className="h-4 w-4 text-navy-300 group-hover:text-teal-500 shrink-0 mt-1 transition-colors" />
                )}
              </div>
            </Wrapper>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-8 w-8 text-navy-200 mx-auto mb-2" />
            <p className="text-navy-400">Aucune ressource trouvee</p>
          </div>
        )}
      </div>
    </div>
  );
}
