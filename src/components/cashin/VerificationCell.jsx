import { useDispatch, useSelector } from "react-redux";
import { fetchReconciliationStatus, selectIsLockedForOperations } from "../../store/checkReconcile";
import VerifierAvatars from "../global/verifierAvatars.jsx/VerifierAvatars";
import VerifyButton from "../verifyButton/VerifyButton";
import CashInDetails from "./CashInDetails";
import { useEffect } from "react";

const VerificationCell = ({ row, user, activeVerifyId, setActiveVerifyId, verifyLoading, handleVerifyClick, handleRejectVerifyClick }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (row?.vault_id) {
      dispatch(fetchReconciliationStatus(row.vault_id));
    }
  }, [dispatch, row?.vault_id]);

  // Safe Execution: This selector runs ONLY when a valid vault_id exists
  const isLocked = useSelector((state) => selectIsLockedForOperations(state, row.vault_id));

  const isVerifierShowButton = row?.required_verifiers?.some((verifier) => verifier?.user_id === user?.id && !verifier?.verified);
  const isVerified = row?.verifier_status === "verified";
  const isRejected = row?.verifier_status === "rejected" || row?.approver_status === "rejected";

  return (
    <div className="flex items-center justify-center gap-2">
      <VerifierAvatars requiredVerifiers={row.required_verifiers || []} isRejected={isRejected} />
      {isVerifierShowButton && !isRejected && !isLocked ? (
        <VerifyButton
          handleSubmit={() => handleVerifyClick(row.id)}
          handleReject={(note) => handleRejectVerifyClick(row.id, note)}
          isOpen={activeVerifyId === row.id}
          isLoading={verifyLoading}
          setOpen={(isOpen) => setActiveVerifyId(isOpen ? row.id : null)}
          className="max-w-xl"
          title="Verify"
          rejectTitle="Reject this cash-in?"
        >
          <CashInDetails cashIn={row} />
        </VerifyButton>
      ) : (
        isLocked && !isVerified && <span className="text-red-500 font-medium text-xs whitespace-nowrap">Cash in is locked</span>
      )}
    </div>
  );
};

export default VerificationCell;
