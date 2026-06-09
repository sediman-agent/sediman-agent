import { useState } from 'react';
import { ChevronLeft, Copy, Check } from 'lucide-react';
import type { UIDocsComponent } from './components';

interface ComponentShowcaseProps {
  component: UIDocsComponent;
  onBack: () => void;
}

export function ComponentShowcase({ component, onBack }: ComponentShowcaseProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Components
      </button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
            {component.category}
          </span>
          <h1 className="text-3xl font-bold text-foreground">{component.name}</h1>
        </div>
        <p className="text-muted-foreground">{component.description}</p>
      </div>

      {/* Live Preview */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Preview</h2>
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center justify-center min-h-[120px]">
            {component.preview}
          </div>
        </div>
      </section>

      {/* Documentation */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Documentation</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="prose prose-invert max-w-none">
            <p className="whitespace-pre-line text-muted-foreground">{component.documentation}</p>
          </div>
        </div>
      </section>

      {/* Props */}
      {component.props.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Props</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-foreground">Prop</th>
                  <th className="text-left p-3 text-sm font-medium text-foreground">Type</th>
                  <th className="text-left p-3 text-sm font-medium text-foreground">Default</th>
                  <th className="text-left p-3 text-sm font-medium text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {component.props.map((prop, index) => (
                  <tr key={index} className="bg-background">
                    <td className="p-3 text-sm">
                      <code className="px-2 py-1 bg-muted rounded text-xs font-mono text-foreground">
                        {prop.name}
                      </code>
                    </td>
                    <td className="p-3 text-sm">
                      <code className="text-xs text-muted-foreground">{prop.type}</code>
                    </td>
                    <td className="p-3 text-sm">
                      <code className="text-xs text-primary">{prop.default}</code>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{prop.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Examples */}
      {component.examples.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Examples</h2>
          <div className="space-y-6">
            {component.examples.map((example, index) => (
              <div key={index} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="text-base font-semibold text-foreground mb-1">{example.title}</h3>
                  <p className="text-sm text-muted-foreground">{example.description}</p>
                </div>

                <div className="p-6">
                  <div className="mb-4 flex items-center justify-center min-h-[80px] bg-background rounded-lg">
                    {example.component}
                  </div>

                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Code</span>
                      <button
                        onClick={() => handleCopyCode(example.code)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedCode === example.code ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-background p-4 rounded-lg overflow-x-auto text-xs">
                      <code className="text-muted-foreground">{example.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
