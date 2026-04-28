import { useEffect, useRef, useState } from 'react';

interface ContextMenuSubOption {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuOption {
  label: string;
  onClick?: () => void;
  submenu?: ContextMenuSubOption[];
  disabled?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, options, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const submenuTimeoutRef = useRef<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number }>({ left: x, top: y });
  const [submenuPositions, setSubmenuPositions] = useState<Record<number, { left: string; right: string; top: string; bottom: string }>>({});
  const [submenuOnLeft, setSubmenuOnLeft] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8;

      let finalLeft = x;
      let finalTop = y;

      if (finalLeft + menuRect.width + padding > viewportWidth) {
        finalLeft = x - menuRect.width;
      }
      if (finalLeft < padding) {
        finalLeft = padding;
      }

      if (finalTop + menuRect.height + padding > viewportHeight) {
        finalTop = y - menuRect.height;
      }
      if (finalTop < padding) {
        finalTop = padding;
      }

      const submenuWidth = 180;
      const spaceOnRightForSubmenu = viewportWidth - (finalLeft + menuRect.width);
      setSubmenuOnLeft(spaceOnRightForSubmenu < submenuWidth);

      setMenuPosition({ left: finalLeft, top: finalTop });
      setVisible(true);
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (submenuTimeoutRef.current) {
        clearTimeout(submenuTimeoutRef.current);
      }
    };
  }, [onClose]);

  const handleMouseEnter = (index: number, hasSubmenu: boolean, event?: React.MouseEvent) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    if (hasSubmenu) {
      setActiveSubmenu(index);

      if (event && menuRef.current) {
        const buttonRect = event.currentTarget.getBoundingClientRect();
        const menuRect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const submenuWidth = 180;
        const submenuHeight = 200;

        const spaceOnRight = viewportWidth - menuRect.right;
        const spaceOnLeft = menuRect.left;
        const spaceOnBottom = viewportHeight - buttonRect.top;

        let horizontalPos: { left: string; right: string };

        if (spaceOnRight >= submenuWidth) {
          horizontalPos = { left: '100%', right: 'auto' };
        } else if (spaceOnLeft >= submenuWidth) {
          horizontalPos = { left: 'auto', right: '100%' };
        } else if (spaceOnRight >= spaceOnLeft) {
          horizontalPos = { left: '100%', right: 'auto' };
        } else {
          horizontalPos = { left: 'auto', right: '100%' };
        }

        let verticalPos = { top: '0', bottom: 'auto' };
        if (spaceOnBottom < submenuHeight) {
          verticalPos = { top: 'auto', bottom: '0' };
        }

        setSubmenuPositions(prev => ({
          ...prev,
          [index]: { ...horizontalPos, ...verticalPos }
        }));
      }
    } else {
      setActiveSubmenu(null);
    }
  };

  const handleMouseLeave = (hasSubmenu: boolean) => {
    if (submenuTimeoutRef.current) {
      clearTimeout(submenuTimeoutRef.current);
    }
    if (hasSubmenu) {
      submenuTimeoutRef.current = window.setTimeout(() => {
        setActiveSubmenu(null);
      }, 200);
    }
  };

  const isSubmenuOnLeft = (index: number) => {
    if (activeSubmenu === index && submenuPositions[index]) {
      return submenuPositions[index].right === '100%';
    }
    return submenuOnLeft;
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 rounded-lg shadow-lg py-2 min-w-[200px]"
      style={{
        left: `${menuPosition.left}px`,
        top: `${menuPosition.top}px`,
        visibility: visible ? 'visible' : 'hidden',
        backgroundColor: 'var(--color-surface)',
        border: `1px solid var(--color-border)`
      }}
    >
      {options.map((option, index) => (
        <div key={index} className="relative">
          <button
            onClick={() => {
              if (!option.disabled && option.onClick) {
                option.onClick();
                onClose();
              }
            }}
            disabled={option.disabled}
            className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between gap-3"
            style={{
              color: option.disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
              cursor: option.disabled ? 'not-allowed' : 'pointer',
              opacity: option.disabled ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!option.disabled) {
                e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                handleMouseEnter(index, !!option.submenu, e);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              handleMouseLeave(!!option.submenu);
            }}
          >
            <span>{option.label}</span>
            {option.submenu && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: isSubmenuOnLeft(index) ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s',
                  flexShrink: 0,
                }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>

          {option.submenu && activeSubmenu === index && (
            <div
              className="absolute rounded-lg shadow-lg py-2 min-w-[180px] z-50"
              style={{
                left: submenuPositions[index]?.left || '100%',
                right: submenuPositions[index]?.right || 'auto',
                top: submenuPositions[index]?.top || '0',
                bottom: submenuPositions[index]?.bottom || 'auto',
                marginLeft: submenuPositions[index]?.left === '100%' ? '4px' : '0',
                marginRight: submenuPositions[index]?.right === '100%' ? '4px' : '0',
                backgroundColor: 'var(--color-surface)',
                border: `1px solid var(--color-border)`
              }}
              onMouseEnter={() => {
                if (submenuTimeoutRef.current) {
                  clearTimeout(submenuTimeoutRef.current);
                }
              }}
              onMouseLeave={() => {
                if (submenuTimeoutRef.current) {
                  clearTimeout(submenuTimeoutRef.current);
                }
                submenuTimeoutRef.current = window.setTimeout(() => {
                  setActiveSubmenu(null);
                }, 200);
              }}
            >
              {option.submenu.map((subOption, subIndex) => (
                <button
                  key={subIndex}
                  onClick={() => {
                    if (!subOption.disabled) {
                      subOption.onClick();
                      onClose();
                    }
                  }}
                  disabled={subOption.disabled}
                  className="w-full text-left px-4 py-2 text-sm transition-colors"
                  style={{
                    color: subOption.disabled ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                    cursor: subOption.disabled ? 'not-allowed' : 'pointer',
                    opacity: subOption.disabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!subOption.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
                    }
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {subOption.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
