export const DEFAULT_LABEL = 'Explore';

export function createInitialLabelState() {
  return {
    active: DEFAULT_LABEL,
    pending: null,
    isVisible: true,
    shouldDelay: true,
  };
}

export function labelStateReducerFactory(hasLabelAppearedRef) {
  return (state, action) => {
    switch (action.type) {
      case 'RESET':
        return {
          ...state,
          active: DEFAULT_LABEL,
          pending: null,
          isVisible: true,
          shouldDelay: !hasLabelAppearedRef.current,
        };
      case 'OPEN':
        return {
          ...state,
          isVisible: true,
          shouldDelay: !hasLabelAppearedRef.current,
        };
      case 'REQUEST_CHANGE': {
        const { nextLabel } = action.payload;
        if (nextLabel === state.active && state.isVisible) return state;
        if (!hasLabelAppearedRef.current) {
          return { ...state, active: nextLabel, pending: null, shouldDelay: false };
        }
        return { ...state, pending: nextLabel, isVisible: false, shouldDelay: false };
      }
      case 'FADE_IN':
        if (!state.isVisible) {
          hasLabelAppearedRef.current = true;
          return {
            ...state,
            active: state.pending ?? DEFAULT_LABEL,
            pending: null,
            isVisible: true,
            shouldDelay: false,
          };
        }
        hasLabelAppearedRef.current = true;
        return state;
      case 'FORCE_FADE_IN':
        hasLabelAppearedRef.current = true;
        return {
          ...state,
          active: state.pending ?? DEFAULT_LABEL,
          pending: null,
          isVisible: true,
          shouldDelay: false,
        };
      default:
        return state;
    }
  };
}
