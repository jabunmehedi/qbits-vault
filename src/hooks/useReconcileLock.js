import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchReconciliationStatus, selectIsLockedForOperations } from "../store/checkReconcile";

// While an audit/reconcile is in progress the vault is locked for all cash operations.
// This fetches the lock status for the given vault and returns whether it's locked, so
// verify/approve/receive buttons can be hidden ("lock means lock").
export const useReconcileLock = (vaultId) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (vaultId) {
      dispatch(fetchReconciliationStatus(vaultId));
    }
  }, [dispatch, vaultId]);

  return useSelector((state) => selectIsLockedForOperations(state, vaultId));
};
