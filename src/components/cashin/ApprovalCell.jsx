import { useDispatch, useSelector } from "react-redux";
import { fetchReconciliationStatus, selectIsLockedForOperations } from "../../store/checkReconcile";
import VerifierAvatars from "../global/verifierAvatars.jsx/VerifierAvatars";
import VerifyButton from "../verifyButton/VerifyButton";
import CashInDetails from "./CashInDetails";
import { useEffect } from "react";

const ApprovalCell = ({ row, user, activeApproveId, setActiveApproveId, verifyLoading, handleApprovedClick, handleRejectClick }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (row?.vault_id) {
      dispatch(fetchReconciliationStatus(row.vault_id));
    }
  }, [dispatch, row?.vault_id]);

  // Safe Execution: This selector runs ONLY when a valid vault_id exists
  const isLocked = useSelector((state) => selectIsLockedForOperations(state, row.vault_id));

  const isApproverShowButton = row?.required_approvers?.some((approver) => approver?.user_id === user?.id && !approver?.approved);
  const isVerified = row?.verifier_status === "verified";
  const isApproved = row?.approver_status === "approved";
  const isRejected = row?.verifier_status === "rejected" || row?.approver_status === "rejected";

  return (
    <div className="flex items-center gap-2">
      <VerifierAvatars requiredVerifiers={row.required_approvers || []} isRejected={isRejected} />

      {isApproverShowButton && isVerified && !isRejected ? (
        <VerifyButton
          handleSubmit={() => handleApprovedClick(row.id)}
          handleReject={handleRejectClick}
          isOpen={activeApproveId === row.id}
          isLoading={verifyLoading}
          setOpen={(isOpen) => setActiveApproveId(isOpen ? row.id : null)}
          className="max-w-xl"
          title="Approve"
        >
          <CashInDetails cashIn={row} />
        </VerifyButton>
      ) : (
        isLocked &&
        !isApproved && (
          <div>
            <span className="text-red-500 font-medium text-xs">Cash in is locked</span>
          </div>
        )
      )}

    </div>
  );
};

export default ApprovalCell;
