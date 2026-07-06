'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, AlertTriangle, Loader2, FileJson, Trash2 } from 'lucide-react';

type ImportResult = {
  success: boolean;
  results: {
    inserted: number;
    translations: number;
    errors: string[];
  };
  summary: string;
};

export function ImportPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<Record<string, unknown>[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'replace' | 'append'>('replace');

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setParsedData(null);
    setParseError(null);
    setResult(null);

    if (selectedFiles.length === 0) return;

    try {
      const allItems: Record<string, unknown>[] = [];

      // Sort files by name to maintain lot order
      const sorted = selectedFiles.sort((a, b) => a.name.localeCompare(b.name));

      for (const file of sorted) {
        const text = await file.text();
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          allItems.push(...json);
        } else {
          throw new Error(`${file.name}: le fichier n'est pas un tableau JSON`);
        }
      }

      setParsedData(allItems);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Erreur de parsing');
    }
  }, []);

  const handleImport = async () => {
    if (!parsedData) return;

    setImporting(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/import-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsedData, mode }),
      });

      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({
        success: false,
        results: { inserted: 0, translations: 0, errors: [err instanceof Error ? err.message : 'Network error'] },
        summary: 'Erreur reseau',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setParsedData(null);
    setParseError(null);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select files */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            1. Selectionner les fichiers JSON
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-cream-200 rounded-lg p-8 text-center hover:border-navy-300 transition-colors">
              <input
                type="file"
                multiple
                accept=".json,.txt,.json.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-navy-300 mb-3" />
                <p className="text-sm font-medium text-navy-700">
                  Cliquez pour selectionner les fichiers
                </p>
                <p className="text-xs text-navy-400 mt-1">
                  Formats acceptes : .json, .txt, .json.txt (lots de vocabulaire)
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-navy-600">
                  <strong>{files.length}</strong> fichier{files.length > 1 ? 's' : ''} selectionne{files.length > 1 ? 's' : ''}
                  {files.map((f) => (
                    <span key={f.name} className="block text-xs text-navy-400">
                      {f.name} ({(f.size / 1024).toFixed(1)} KB)
                    </span>
                  ))}
                </div>
                <Button variant="secondary" size="sm" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Effacer
                </Button>
              </div>
            )}

            {parseError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {parseError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Preview & validate */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              2. Apercu et validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <Stat label="Mots charges" value={parsedData.length} />
              <Stat
                label="Avec trad. FR"
                value={parsedData.filter((d) => (d.translations as Record<string, unknown>)?.fr).length}
              />
              <Stat
                label="Avec trad. EN"
                value={parsedData.filter((d) => (d.translations as Record<string, unknown>)?.en).length}
              />
              <Stat
                label="Avec traditionnel"
                value={parsedData.filter((d) => d.traditional).length}
              />
            </div>

            {/* Theme distribution */}
            <div className="mb-6">
              <p className="text-sm font-medium text-navy-700 mb-2">Repartition par theme :</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(
                  parsedData.reduce<Record<string, number>>(
                    (acc, item) => {
                      const theme = (item.theme as string) || 'unknown';
                      acc[theme] = (acc[theme] || 0) + 1;
                      return acc;
                    },
                    {}
                  )
                )
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([theme, count]) => (
                    <span
                      key={theme}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy-700"
                    >
                      {theme}: {String(count)}
                    </span>
                  ))}
              </div>
            </div>

            {/* Sample preview */}
            <div className="mb-6">
              <p className="text-sm font-medium text-navy-700 mb-2">Apercu (5 premiers) :</p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-cream-100">
                      <th className="text-left py-2 px-2 font-medium text-navy-500">Simplifie</th>
                      <th className="text-left py-2 px-2 font-medium text-navy-500">Pinyin</th>
                      <th className="text-left py-2 px-2 font-medium text-navy-500">FR</th>
                      <th className="text-left py-2 px-2 font-medium text-navy-500">EN</th>
                      <th className="text-left py-2 px-2 font-medium text-navy-500">Theme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((item, idx) => (
                      <tr key={idx} className="border-b border-cream-50">
                        <td className="py-2 px-2 text-lg font-medium">{item.simplified as string}</td>
                        <td className="py-2 px-2 text-navy-600">{item.pinyin as string}</td>
                        <td className="py-2 px-2">{(item.translations as { fr?: { meaning?: string } })?.fr?.meaning}</td>
                        <td className="py-2 px-2">{(item.translations as { en?: { meaning?: string } })?.en?.meaning}</td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-0.5 rounded bg-cream-100 text-xs">{item.theme as string}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="accent-navy-600"
                />
                <span className="text-sm">
                  <strong>Remplacer</strong> - supprime l&apos;ancien vocabulaire HSK1 et le remplace
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'append'}
                  onChange={() => setMode('append')}
                  className="accent-navy-600"
                />
                <span className="text-sm">
                  <strong>Ajouter</strong> - ajoute aux donnees existantes (upsert)
                </span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Import */}
      {parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>3. Importer dans Supabase</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleImport}
              disabled={importing}
              size="lg"
              className="w-full sm:w-auto"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer {parsedData.length} mots dans Supabase
                </>
              )}
            </Button>

            {result && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <p className="font-medium flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  {result.summary}
                </p>
                {result.results.errors.length > 0 && (
                  <ul className="mt-2 text-sm space-y-1">
                    {result.results.errors.map((err, i) => (
                      <li key={i} className="text-red-600">• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 bg-cream-50 rounded-lg text-center">
      <p className="text-2xl font-bold text-navy-900">{value}</p>
      <p className="text-xs text-navy-400">{label}</p>
    </div>
  );
}
