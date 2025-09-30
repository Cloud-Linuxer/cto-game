import { useEffect } from 'react';

export const useKeyboardShortcut = (key, callback, deps = []) => {
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === key && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        if (!isInput) {
          event.preventDefault();
          callback();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [key, callback, ...deps]);
};

export default useKeyboardShortcut;