import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { uidocsComponents } from './components';
import { ComponentShowcase } from './ComponentShowcase';

type Category = 'all' | 'actions' | 'form' | 'feedback' | 'overlays' | 'navigation' | 'data';

export function UIDocsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const categories: { id: Category; label: string; count: number }[] = [
    { id: 'all', label: 'All Components', count: uidocsComponents.length },
    { id: 'actions', label: 'Actions', count: uidocsComponents.filter(c => c.category === 'actions').length },
    { id: 'form', label: 'Form', count: uidocsComponents.filter(c => c.category === 'form').length },
    { id: 'feedback', label: 'Feedback', count: uidocsComponents.filter(c => c.category === 'feedback').length },
    { id: 'overlays', label: 'Overlays', count: uidocsComponents.filter(c => c.category === 'overlays').length },
    { id: 'navigation', label: 'Navigation', count: uidocsComponents.filter(c => c.category === 'navigation').length },
    { id: 'data', label: 'Data', count: uidocsComponents.filter(c => c.category === 'data').length },
  ];

  const filteredComponents = selectedComponent
    ? uidocsComponents.filter(c => c.id === selectedComponent)
    : uidocsComponents.filter(c => selectedCategory === 'all' || c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b border-border z-50">
        <div className="h-full flex items-center justify-between px-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">OpenSkynet UI</h1>
            <p className="text-sm text-muted-foreground">Component Documentation</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-muted border border-border"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
            <span className="text-sm text-muted-foreground">
              {uidocsComponents.length} components
            </span>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside className="w-64 fixed left-0 top-14 bottom-0 bg-background border-r border-border overflow-y-auto">
          <nav className="p-4">
            <div className="space-y-6">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedComponent(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                    <span className="ml-2 text-xs opacity-60">({cat.count})</span>
                  </button>
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          {selectedComponent ? (
            <ComponentShowcase
              component={uidocsComponents.find(c => c.id === selectedComponent)!}
              onBack={() => setSelectedComponent(null)}
            />
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredComponents.map((component) => (
                  <div
                    key={component.id}
                    onClick={() => setSelectedComponent(component.id)}
                    className="group cursor-pointer bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all hover:shadow-lg"
                  >
                    <div className="mb-4">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {component.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {component.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {component.description}
                    </p>
                    <div className="min-h-[100px] flex items-center justify-center bg-muted/30 rounded-lg p-4 border border-border/50">
                      {component.preview}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
