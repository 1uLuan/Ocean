import { useConfigStore } from '@/stores/ConfigStore';
import React, { useEffect } from 'react';

export function ConfigScreen() {
  const config = useConfigStore((state) => state.config);
  const configIsOpen = useConfigStore((state) => state.configIsOpen);
  const geralConfig = useConfigStore((state) => state.geralConfig);
  const themesConfig = useConfigStore((state) => state.themesConfig);
  const setGeralConfig = useConfigStore((state) => state.setGeralConfig);
  const setThemesConfig = useConfigStore((state) => state.setThemesConfig);
  const changeTheme = useConfigStore((state) => state.changeTheme);
  const toggleTitleBar = useConfigStore((state) => state.toggleTitleBar);

  const [activeCategory, setActiveCategory] = React.useState<
    'geral' | 'themes'
  >(() => (geralConfig ? 'geral' : themesConfig ? 'themes' : 'geral'));

  const configButtons: Record<string, () => void> = {
    Geral: () => {
      setGeralConfig(true);
      setActiveCategory('geral');
    },
    Temas: () => {
      setThemesConfig(true);
      setActiveCategory('themes');
    },
  };

  useEffect(() => {
    console.log(config);
  }, [config]);

  return (
    <>
      {configIsOpen && (
        <div
          className="flex flex-col w-full h-full bg-[var(--primary)]"
          style={{ background: 'var(--bg-primary' }}
        >
          <div className="flex flex-row m-0.5 h-full">
            <div className="w-auto h-full bg-[var(--bg-secondary)] border-b border-l border-t border-[var(--border-secondary)] rounded-l-lg p-2">
              {Object.entries(configButtons).map(([nome, action], idx) => (
                <React.Fragment key={idx}>
                  <button
                    className="w-full h-8 p-1 text-left text-[0.9rem] text-[var(--text-primary)] hover:bg-[var(--bg-hover-primary)] hover:rounded-lg pr-6"
                    onClick={action}
                  >
                    <div className="flex pl-4.5">{nome}</div>
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div className="relative flex flex-col pl-1 text-[0.9rem] w-full h-full bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-r-lg pt-3 overflow-hidden">
              <div
                aria-hidden={activeCategory !== 'geral'}
                className={`absolute inset-0 p-3 transition-[opacity,position.y] duration-200 ease-in-out ${
                  activeCategory === 'geral'
                    ? 'opacity-100 translate-x-0 pointer-events-auto'
                    : 'opacity-0 translate-y-6 pointer-events-none'
                }`}
              >
                <div className="flex flex-row pl-2">
                  Title Bar
                  <button
                    className={`flex flex-row self-center con w-8 h-4 rounded-full bg-amber-600 ml-1
                        ${
                          config.title_bar
                            ? 'place-content-end'
                            : 'place-content-start'
                        }
                      `}
                    onClick={() => {
                      toggleTitleBar(!config.title_bar);
                    }}
                  >
                    <div className="w-4 h-4 rounded-full bg-amber-950"></div>
                  </button>
                </div>
              </div>

              <div
                aria-hidden={activeCategory !== 'themes'}
                className={`absolute inset-0 p-3 transition-[opacity,position.y] duration-200 ease-in-out ${
                  activeCategory === 'themes'
                    ? 'opacity-100 translate-x-0 pointer-events-auto'
                    : 'opacity-0 translate-y-6 pointer-events-none'
                }`}
              >
                Selecionar Tema
                <button
                  className="w-full h-6 pl-2 text-left hover:bg-[var(--bg-hover-primary)] rounded-md"
                  onClick={() => changeTheme('light')}
                >
                  Light
                </button>
                <button
                  className="w-full h-6 pl-2 text-left hover:bg-[var(--bg-hover-primary)] rounded-md"
                  onClick={() => changeTheme('dark')}
                >
                  Dark
                </button>
                <button
                  className="w-full h-6 pl-2 text-left hover:bg-[var(--bg-hover-primary)] rounded-md"
                  onClick={() => changeTheme('ocean')}
                >
                  Ocean
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
