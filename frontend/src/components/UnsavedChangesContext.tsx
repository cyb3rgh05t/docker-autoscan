import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

type UnsavedChangesContextValue = {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  requestNavigation: (path: string) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(
  null,
);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const requestNavigation = useCallback(
    (path: string) => {
      if (path === location.pathname) {
        return;
      }

      if (!hasUnsavedChanges) {
        navigate(path);
        return;
      }

      setPendingPath(path);
    },
    [hasUnsavedChanges, location.pathname, navigate],
  );

  const handleStayHere = () => {
    setPendingPath(null);
  };

  const handleDiscardAndContinue = () => {
    if (!pendingPath) {
      return;
    }

    setHasUnsavedChanges(false);
    navigate(pendingPath);
    setPendingPath(null);
  };

  const value = useMemo(
    () => ({
      hasUnsavedChanges,
      setHasUnsavedChanges,
      requestNavigation,
    }),
    [hasUnsavedChanges, requestNavigation],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      {pendingPath ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="confirm-dialog">
            <h3 className="heading-md" style={{ marginBottom: "0.5rem" }}>
              Unsaved changes
            </h3>
            <p className="text-body" style={{ marginBottom: "1rem" }}>
              You have unsaved changes. Do you want to discard them and
              continue?
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button type="button" className="btn" onClick={handleStayHere}>
                Stay here
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDiscardAndContinue}
              >
                Discard and continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);

  if (!context) {
    throw new Error(
      "useUnsavedChanges must be used within UnsavedChangesProvider",
    );
  }

  return context;
}
